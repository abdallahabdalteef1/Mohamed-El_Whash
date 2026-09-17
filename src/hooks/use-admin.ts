import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export function useIsAdmin(session: Session | null) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!session) {
      setIsAdmin(null);
      return;
    }
    // Grants admin to the first signed-in account; afterwards it only reports status.
    supabase.rpc("claim_admin").then(({ data, error }) => {
      if (!mounted) return;
      setIsAdmin(error ? false : Boolean(data));
    });
    return () => {
      mounted = false;
    };
  }, [session]);

  return isAdmin;
}
