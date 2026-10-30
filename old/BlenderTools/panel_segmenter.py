bl_info = {
    "name": "Panel Segmenter",
    "author": "LikeDust",
    "version": (2, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Sidebar > Panels",
    "description": "Segment comic pages into panel crops with live node-based preview",
    "category": "Object",
}

import bpy
import json
import os
from bpy.props import FloatProperty, StringProperty, BoolProperty, PointerProperty, IntProperty
from bpy.app.handlers import persistent

# ---------------------------------------------------------------------------
# Core: sync an object's crop properties -> Mapping node + transform
# ---------------------------------------------------------------------------

def sync_panel_to_crop(obj):
    """Read pseg_crop values, update the Mapping node and plane transform."""
    crop = obj.pseg_crop
    
    # Coordinate convention:
    # u0 = top_left_x
    # u1 = bottom_right_x
    # v0 = 1.0 - bottom_right_y
    # v1 = 1.0 - top_left_y
    u0 = crop.top_left_x
    u1 = crop.bottom_right_x
    v0 = 1.0 - crop.bottom_right_y
    v1 = 1.0 - crop.top_left_y
    
    du = max(1e-4, u1 - u0)
    dv = max(1e-4, v1 - v0)

    mat = obj.active_material
    if mat and mat.use_nodes:
        mapping = mat.node_tree.nodes.get("Panel Mapping")
        if mapping:
            # Set values without triggering depsgraph update loop
            mapping.inputs['Location'].default_value = (u0, v0, 0)
            mapping.inputs['Scale'].default_value = (du, dv, 1)

    scene = bpy.context.scene
    pw = scene.pseg.page_width
    ph = scene.pseg.page_height
    ps = scene.pseg.pixel_scale

    obj.scale = (du * pw * ps / 2, dv * ph * ps / 2, 1)
    obj.location = (
        ((crop.top_left_x + crop.bottom_right_x) / 2 - 0.5) * pw * ps,
        ((2 - crop.top_left_y - crop.bottom_right_y) / 2 - 0.5) * ph * ps,
        obj.location.z,
    )


def _crop_update(self, context):
    obj = self.id_data
    if isinstance(obj, bpy.types.Object) and obj.get("is_panel_crop"):
        # Prevent recursive updates from depsgraph handler
        if not getattr(obj, "_pseg_syncing", False):
            obj._pseg_syncing = True
            sync_panel_to_crop(obj)
            obj._pseg_syncing = False


# ---------------------------------------------------------------------------
# PropertyGroups
# ---------------------------------------------------------------------------

class PSEGSceneProps(bpy.types.PropertyGroup):
    source_image: PointerProperty(name="Source Image", type=bpy.types.Image)
    page_width: IntProperty(name="Page Width", default=1000)
    page_height: IntProperty(name="Page Height", default=1000)
    pixel_scale: FloatProperty(name="Pixel Scale", default=0.001, precision=4)

class PSEGCropProps(bpy.types.PropertyGroup):
    top_left_x: FloatProperty(name="X", default=0.0, min=0.0, max=1.0,
                       step=1, precision=4, update=_crop_update)
    top_left_y: FloatProperty(name="Y", default=0.0, min=0.0, max=1.0,
                       step=1, precision=4, update=_crop_update)
    bottom_right_x: FloatProperty(name="X", default=1.0, min=0.0, max=1.0,
                       step=1, precision=4, update=_crop_update)
    bottom_right_y: FloatProperty(name="Y", default=1.0, min=0.0, max=1.0,
                       step=1, precision=4, update=_crop_update)


# ---------------------------------------------------------------------------
# Depsgraph handler for bidirectional sync (Nodes -> Sidebar)
# ---------------------------------------------------------------------------

@persistent
def pseg_depsgraph_update(scene, depsgraph):
    for update in depsgraph.updates:
        if isinstance(update.id, bpy.types.Material):
            mat = update.id
            if not mat.use_nodes:
                continue
            mapping = mat.node_tree.nodes.get("Panel Mapping")
            if not mapping:
                continue
            
            loc = mapping.inputs['Location'].default_value
            scale = mapping.inputs['Scale'].default_value
            
            u0 = loc[0]
            v0 = loc[1]
            u1 = u0 + scale[0]
            v1 = v0 + scale[1]
            
            top_left_x = u0
            bottom_right_x = u1
            top_left_y = 1.0 - v1
            bottom_right_y = 1.0 - v0
            
            # Find objects using this material
            for obj in scene.objects:
                if obj.get("is_panel_crop") and obj.active_material == mat:
                    crop = obj.pseg_crop
                    # Check if values actually changed to avoid infinite loops
                    if (abs(crop.top_left_x - top_left_x) > 1e-5 or
                        abs(crop.bottom_right_x - bottom_right_x) > 1e-5 or
                        abs(crop.top_left_y - top_left_y) > 1e-5 or
                        abs(crop.bottom_right_y - bottom_right_y) > 1e-5):
                        
                        obj._pseg_syncing = True
                        crop.top_left_x = top_left_x
                        crop.bottom_right_x = bottom_right_x
                        crop.top_left_y = top_left_y
                        crop.bottom_right_y = bottom_right_y
                        sync_panel_to_crop(obj)
                        obj._pseg_syncing = False

# ---------------------------------------------------------------------------
# Material builder
# ---------------------------------------------------------------------------

def _make_crop_material(name, image, top_left_x, top_left_y, bottom_right_x, bottom_right_y):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    tc = nt.nodes.new('ShaderNodeTexCoord')
    tc.location = (-700, 0)

    mp = nt.nodes.new('ShaderNodeMapping')
    mp.name = "Panel Mapping"
    mp.label = "Crop Region"
    mp.location = (-450, 0)
    
    u0 = top_left_x
    v0 = 1.0 - bottom_right_y
    du = bottom_right_x - top_left_x
    dv = bottom_right_y - top_left_y
    
    mp.inputs['Location'].default_value = (u0, v0, 0)
    mp.inputs['Scale'].default_value = (du, dv, 1)

    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.name = "Page Image"
    tx.label = "Page Image"
    tx.image = image
    tx.location = (-150, 0)

    bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bs.location = (200, 0)
    for key in ('Specular IOR Level', 'Specular'):
        inp = bs.inputs.get(key)
        if inp is not None:
            inp.default_value = 0
            break
    bs.inputs['Roughness'].default_value = 1

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (500, 0)

    nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], tx.inputs['Vector'])
    nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
    nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])

    return mat


# ---------------------------------------------------------------------------
# Collection helper
# ---------------------------------------------------------------------------

def _get_collection(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


# ---------------------------------------------------------------------------
# Plane builders
# ---------------------------------------------------------------------------

def _make_panel_plane(context, name, image, top_left_x, top_left_y, bottom_right_x, bottom_right_y, z=0.0):
    col = _get_collection("Panel Crops")

    bpy.ops.mesh.primitive_plane_add(size=2)
    obj = context.active_object
    obj.name = name

    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)

    mat = _make_crop_material(name + "_Mat", image, top_left_x, top_left_y, bottom_right_x, bottom_right_y)
    obj.data.materials.clear()
    obj.data.materials.append(mat)

    obj["is_panel_crop"] = True

    # Set crop properties via dict access to avoid triggering update callbacks
    crop = obj.pseg_crop
    obj._pseg_syncing = True
    crop.top_left_x = top_left_x
    crop.top_left_y = top_left_y
    crop.bottom_right_x = bottom_right_x
    crop.bottom_right_y = bottom_right_y
    obj.location.z = z
    sync_panel_to_crop(obj)
    obj._pseg_syncing = False

    return obj


def _make_reference_plane(context, image, pw, ph):
    col = _get_collection("Panel Crops")
    
    obj = bpy.data.objects.get("Page_Reference")
    if obj:
        # Update existing
        mat = obj.active_material
        if mat and mat.use_nodes:
            tx = mat.node_tree.nodes.get("Page Image")
            if tx:
                tx.image = image
    else:
        bpy.ops.mesh.primitive_plane_add(size=2)
        obj = context.active_object
        obj.name = "Page_Reference"

        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        col.objects.link(obj)

        mat = bpy.data.materials.new("Page_Reference_Mat")
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()

        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.name = "Page Image"
        tx.image = image
        tx.location = (-200, 0)

        bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
        bs.location = (150, 0)
        for key in ('Specular IOR Level', 'Specular'):
            inp = bs.inputs.get(key)
            if inp is not None:
                inp.default_value = 0
                break
        bs.inputs['Roughness'].default_value = 1
        bs.inputs['Alpha'].default_value = 0.25

        out = nt.nodes.new('ShaderNodeOutputMaterial')
        out.location = (450, 0)

        nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
        nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])

        obj.data.materials.clear()
        obj.data.materials.append(mat)

        if hasattr(mat, 'blend_method'):
            mat.blend_method = 'BLEND'
        mat.use_backface_culling = False

    ps = context.scene.pseg.pixel_scale
    w = pw * ps
    h = ph * ps
    obj.scale = (w / 2, h / 2, 1)
    obj.location = (0, 0, -0.002)

    return obj


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class PSEG_OT_assign_image(bpy.types.Operator):
    """Assign a source image for the page"""
    bl_idname = "pseg.assign_image"
    bl_label = "Assign Page Image"
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(subtype='FILE_PATH')
    filter_image: BoolProperty(default=True, options={'HIDDEN'})
    filter_folder: BoolProperty(default=True, options={'HIDDEN'})

    def execute(self, context):
        if not self.filepath:
            return {'CANCELLED'}
        
        image = bpy.data.images.load(self.filepath, check_existing=True)
        scene = context.scene
        scene.pseg.source_image = image
        scene.pseg.page_width = image.size[0]
        scene.pseg.page_height = image.size[1]
        
        _make_reference_plane(context, image, image.size[0], image.size[1])
        
        # Update existing panels if any
        for obj in bpy.data.objects:
            if obj.get("is_panel_crop"):
                sync_panel_to_crop(obj)
                mat = obj.active_material
                if mat and mat.use_nodes:
                    tx = mat.node_tree.nodes.get("Page Image")
                    if tx:
                        tx.image = image
        
        # Set viewport to Material Preview
        for area in context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.shading.type = 'MATERIAL'
                break
                
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class PSEG_OT_add_panel(bpy.types.Operator):
    """Add a new panel crop"""
    bl_idname = "pseg.add_panel"
    bl_label = "Add Panel"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        return context.scene.pseg.source_image is not None

    def execute(self, context):
        image = context.scene.pseg.source_image
        
        # Find next index
        idx = 1
        while bpy.data.objects.get(f"Panel_{idx:02d}"):
            idx += 1

        obj = _make_panel_plane(context, f"Panel_{idx:02d}", image, 0.0, 0.0, 1.0, 1.0, z=0.001 * idx)
        
        # Select the new panel
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        context.view_layer.objects.active = obj
        
        self.report({'INFO'}, f"Added Panel_{idx:02d}")
        return {'FINISHED'}


class PSEG_OT_remove_panel(bpy.types.Operator):
    """Remove the selected panel crop"""
    bl_idname = "pseg.remove_panel"
    bl_label = "Remove Panel"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.get("is_panel_crop")

    def execute(self, context):
        obj = context.active_object
        name = obj.name
        mat = obj.active_material
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mat and mat.users == 0:
            bpy.data.materials.remove(mat)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
        self.report({'INFO'}, f"Removed {name}")
        return {'FINISHED'}


class PSEG_OT_export_json(bpy.types.Operator):
    """Export panel crops to a .panels.json file"""
    bl_idname = "pseg.export_json"
    bl_label = "Export Panels JSON"
    bl_options = {'REGISTER'}

    filepath: StringProperty(subtype='FILE_PATH', default="page.panels.json")
    filter_glob: StringProperty(default="*.json", options={'HIDDEN'})

    def execute(self, context):
        scene = context.scene
        if not scene.pseg.source_image:
            self.report({'ERROR'}, "No source image assigned")
            return {'CANCELLED'}
            
        panels = []
        for obj in bpy.data.objects:
            if obj.get("is_panel_crop"):
                crop = obj.pseg_crop
                u0 = crop.top_left_x
                u1 = crop.bottom_right_x
                v0 = 1.0 - crop.bottom_right_y
                v1 = 1.0 - crop.top_left_y
                
                # Try to extract ID from name (e.g. Panel_01 -> 1)
                pid = len(panels) + 1
                try:
                    if obj.name.startswith("Panel_"):
                        pid = int(obj.name.split("_")[1])
                except:
                    pass
                
                pw = scene.pseg.page_width
                ph = scene.pseg.page_height
                
                panels.append({
                    "id": pid,
                    "u0": u0,
                    "v0": v0,
                    "u1": u1,
                    "v1": v1,
                    "px": {
                        "x": int(u0 * pw),
                        "y": int((1.0 - v1) * ph),
                        "w": int((u1 - u0) * pw),
                        "h": int((v1 - v0) * ph)
                    }
                })
                
        panels.sort(key=lambda p: p["id"])
        
        data = {
            "source_image": scene.pseg.source_image.name,
            "image_width": scene.pseg.page_width,
            "image_height": scene.pseg.page_height,
            "panels": panels
        }
        
        with open(self.filepath, 'w') as f:
            json.dump(data, f, indent=2)
            
        self.report({'INFO'}, f"Exported {len(panels)} panels to JSON")
        return {'FINISHED'}

    def invoke(self, context, event):
        if context.scene.pseg.source_image:
            name = context.scene.pseg.source_image.name
            if "." in name:
                name = name.rsplit(".", 1)[0]
            self.filepath = f"{name}.panels.json"
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class PSEG_OT_import_json(bpy.types.Operator):
    """Import panel crops from a .panels.json file"""
    bl_idname = "pseg.import_json"
    bl_label = "Import Panels JSON"
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(subtype='FILE_PATH')
    filter_glob: StringProperty(default="*.json", options={'HIDDEN'})

    def execute(self, context):
        if not self.filepath:
            return {'CANCELLED'}
        try:
            with open(self.filepath, 'r') as f:
                data = json.load(f)

            src = data.get("source_image", "")
            pw = data.get("image_width", 1000)
            ph = data.get("image_height", 1000)
            panels = data.get("panels", [])

            base = os.path.dirname(os.path.abspath(self.filepath))
            img_path = os.path.join(base, src)
            if not os.path.isfile(img_path):
                self.report({'ERROR'}, f"Image not found: {img_path}")
                return {'CANCELLED'}

            image = bpy.data.images.load(img_path, check_existing=True)
            
            scene = context.scene
            scene.pseg.source_image = image
            scene.pseg.page_width = pw
            scene.pseg.page_height = ph
            
            _make_reference_plane(context, image, pw, ph)

            for i, p in enumerate(panels):
                pid = p.get("id", i + 1)
                
                u0 = p["u0"]
                v0 = p["v0"]
                u1 = p["u1"]
                v1 = p["v1"]
                
                top_left_x = u0
                bottom_right_x = u1
                top_left_y = 1.0 - v1
                bottom_right_y = 1.0 - v0
                
                _make_panel_plane(
                    context,
                    f"Panel_{pid:02d}",
                    image,
                    top_left_x, top_left_y, bottom_right_x, bottom_right_y,
                    z=0.001 * (i + 1),
                )

            for area in context.screen.areas:
                if area.type == 'VIEW_3D':
                    for space in area.spaces:
                        if space.type == 'VIEW_3D':
                            space.shading.type = 'MATERIAL'
                    break

            bpy.ops.object.select_all(action='DESELECT')
            self.report({'INFO'}, f"Imported {len(panels)} panels")
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class PSEG_OT_select_panel(bpy.types.Operator):
    """Select a panel from the list"""
    bl_idname = "pseg.select_panel"
    bl_label = "Select Panel"
    bl_options = {'INTERNAL'}
    
    panel_name: StringProperty()
    
    def execute(self, context):
        obj = bpy.data.objects.get(self.panel_name)
        if obj:
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            context.view_layer.objects.active = obj
        return {'FINISHED'}

# ---------------------------------------------------------------------------
# Sidebar panel
# ---------------------------------------------------------------------------

class PSEG_PT_main(bpy.types.Panel):
    bl_label = "Panel Segmenter"
    bl_idname = "PSEG_PT_main"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Panels"

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # Source Image Section
        box = layout.box()
        box.label(text="Source Image:", icon='IMAGE_DATA')
        row = box.row()
        if scene.pseg.source_image:
            row.label(text=scene.pseg.source_image.name)
            row.operator("pseg.assign_image", text="", icon='FILE_FOLDER')
            box.label(text=f"{scene.pseg.page_width} x {scene.pseg.page_height} px")
        else:
            row.label(text="None")
            row.operator("pseg.assign_image", text="Assign", icon='FILE_FOLDER')

        layout.separator()
        
        # Add Panel Button
        row = layout.row()
        row.scale_y = 1.5
        row.operator("pseg.add_panel", icon='ADD')
        
        layout.separator()

        # Selected Panel Section
        obj = context.active_object
        if obj and obj.get("is_panel_crop"):
            box = layout.box()
            box.label(text=f"--- Selected: {obj.name} ---", icon='MESH_PLANE')
            
            col = box.column(align=True)
            col.label(text="Top Left")
            row = col.row(align=True)
            row.prop(obj.pseg_crop, "top_left_x")
            row.prop(obj.pseg_crop, "top_left_y")
            
            col.separator()
            col.label(text="Bottom Right")
            row = col.row(align=True)
            row.prop(obj.pseg_crop, "bottom_right_x")
            row.prop(obj.pseg_crop, "bottom_right_y")

            box.separator()
            box.operator("pseg.remove_panel", icon='TRASH')
        else:
            layout.label(text="Select a panel to edit crops.")

        layout.separator()
        
        # All Panels List
        panels = [o for o in bpy.data.objects if o.get("is_panel_crop")]
        if panels:
            box = layout.box()
            box.label(text="--- All Panels ---", icon='OUTLINER_COLLECTION')
            
            # Sort panels by name
            panels.sort(key=lambda o: o.name)
            
            # Display in columns (2 per row)
            col = box.column(align=True)
            for i in range(0, len(panels), 2):
                row = col.row(align=True)
                p1 = panels[i]
                op1 = row.operator("pseg.select_panel", text=p1.name)
                op1.panel_name = p1.name
                
                if i + 1 < len(panels):
                    p2 = panels[i+1]
                    op2 = row.operator("pseg.select_panel", text=p2.name)
                    op2.panel_name = p2.name
                else:
                    row.label(text="")

        layout.separator()
        
        # Export / Import
        row = layout.row(align=True)
        row.operator("pseg.export_json", text="Export JSON", icon='EXPORT')
        row.operator("pseg.import_json", text="Import JSON", icon='IMPORT')


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_classes = (
    PSEGSceneProps,
    PSEGCropProps,
    PSEG_OT_assign_image,
    PSEG_OT_add_panel,
    PSEG_OT_remove_panel,
    PSEG_OT_export_json,
    PSEG_OT_import_json,
    PSEG_OT_select_panel,
    PSEG_PT_main,
)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.pseg = PointerProperty(type=PSEGSceneProps)
    bpy.types.Object.pseg_crop = PointerProperty(type=PSEGCropProps)
    bpy.app.handlers.depsgraph_update_post.append(pseg_depsgraph_update)


def unregister():
    if pseg_depsgraph_update in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(pseg_depsgraph_update)
    if hasattr(bpy.types.Scene, 'pseg'):
        del bpy.types.Scene.pseg
    if hasattr(bpy.types.Object, 'pseg_crop'):
        del bpy.types.Object.pseg_crop
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    try:
        unregister()
    except Exception:
        pass
    register()
