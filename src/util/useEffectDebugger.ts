import { useRef, useEffect, EffectCallback, DependencyList } from "react";

/**
 * Debugging code - will not be present in a production build.
 */
let useEffectDebugger: (effectHook: EffectCallback, dependencies: DependencyList, dependencyNames: []) => void;

if (process.env.NODE_ENV !== "production") {
  const usePrevious = (value: any, initialValue: any) => {
    const ref = useRef(initialValue);
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };
  useEffectDebugger = (effectHook: EffectCallback, dependencies: DependencyList, dependencyNames = []) => {
    const previousDeps = usePrevious(dependencies, []);

    const changedDeps = dependencies.reduce((accum, dependency, index) => {
      if (dependency !== previousDeps[index]) {
        const keyName = dependencyNames[index] || index;
        return {
          ...accum,
          [keyName]: {
            before: previousDeps[index],
            after: dependency,
          },
        };
      }

      return accum;
    }, {});

    if (Object.keys(changedDeps).length) {
      console.log("[use-effect-debugger] ", changedDeps);
    }

    useEffect(effectHook, dependencies);
  };
} else {
  useEffectDebugger = () => {
    console.error("useEffectDebugger UNDEFINED in production mode.");
  };
}

export default useEffectDebugger;
