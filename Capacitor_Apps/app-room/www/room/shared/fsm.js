/* We All Breathe The Same Air · Zero-Dependency Finite State Machine (RoomFlow & SamPose) */
(function () {
  "use strict";

  const machines = {};

  function createMachine(config) {
    const { name, initial, states } = config;
    if (!states || !states[initial]) {
      throw new Error(`[FSM:${name}] Invalid initial state "${initial}"`);
    }

    let current = initial;
    let token = 0;
    const subscribers = new Set();

    function transition(nextState, payload) {
      if (!states[nextState]) {
        console.warn(`[FSM:${name}] Unknown target state "${nextState}"`);
        return current;
      }
      const prev = current;
      const changed = prev !== nextState;
      const nextToken = ++token;

      if (changed && states[prev] && typeof states[prev].onExit === "function") {
        try { states[prev].onExit({ from: prev, to: nextState, payload, token: nextToken }); } catch (e) { console.error(e); }
      }

      current = nextState;

      if (states[current] && typeof states[current].onEnter === "function") {
        try { states[current].onEnter({ from: prev, to: current, changed, payload, token: nextToken }); } catch (e) { console.error(e); }
      }

      for (const fn of subscribers) {
        try { fn({ state: current, from: prev, changed, payload, token: nextToken }); } catch (e) { console.error(e); }
      }
      return current;
    }

    function send(event, payload) {
      const def = states[current];
      const target = def && def.on && def.on[event];
      if (!target) return current;
      const nextState = typeof target === "function" ? target(payload, current) : target;
      if (!nextState) return current;
      return transition(nextState, payload);
    }

    const api = {
      name,
      get state() { return current; },
      get token() { return token; },
      is(s) { return current === s; },
      in(...list) { return list.includes(current); },
      can(event) { return Boolean(states[current] && states[current].on && states[current].on[event]); },
      transition,
      send,
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      }
    };

    if (name) machines[name] = api;
    return api;
  }

  window.LD_FSM = {
    createMachine,
    machines
  };
})();
