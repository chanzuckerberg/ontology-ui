import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/*
 * useNavigate and useSeachParams don't work well in an effect
 * as they change.  Use refs to work around this.
 *
 * Usage is identical to react-router-dom useNavigate(), ie,
 *    const navigate = useNavigateRef();
 */
export function useNavigateRef() {
  const navigate = useNavigate();
  const navigateRef = useRef({ navigate });
  useEffect(() => {
    navigateRef.current.navigate = navigate;
  }, [navigate]);
  return useCallback((location: string) => {
    navigateRef.current.navigate(location);
  }, []);
}
