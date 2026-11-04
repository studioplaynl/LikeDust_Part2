import UIKit
import WebKit
import Capacitor

class RoomBridgeViewController: CAPBridgeViewController {
    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        return config
    }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        view.backgroundColor = .black
        webView?.isOpaque = false
        webView?.backgroundColor = .black
        webView?.scrollView.backgroundColor = .black
        webView?.scrollView.bounces = false
        setStatusBarVisible(false)
    }

    override open var prefersStatusBarHidden: Bool {
        return true
    }

    override open var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }

    override open var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .landscape
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
