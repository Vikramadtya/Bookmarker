import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";

const api = (path, options) =>
  makeApiRequest({ url: `${BASE_URL}${path}`, ...options });

/** Plan, limits, usage and prices. */
export const useBilling = () =>
  useQuery({
    queryKey: ["billing"],
    staleTime: 60_000,
    queryFn: () => api("/billing"),
  });

/** Refetch everything a plan change can affect. */
const refreshPlan = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["billing"] });
  queryClient.invalidateQueries({ queryKey: ["quote"] });
  queryClient.invalidateQueries({ queryKey: ["preferences"] });
};

/** One box for access codes (unlock Pro) and discount codes (wait for checkout). */
export function useRedeem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code) =>
      api("/billing/redeem", { method: "POST", body: { code } }),
    onSuccess: (result) => {
      refreshPlan(queryClient);
      if (result.type === "access")
        toast.success(
          result.lifetime
            ? "Pro unlocked for life"
            : `Pro unlocked until ${new Date(result.until).toLocaleDateString()}`
        );
      else toast.success("Discount applied. It will be used when you upgrade.");
    },
  });
}

export const useQuote = (plan, enabled = true) =>
  useQuery({
    queryKey: ["quote", plan],
    enabled,
    staleTime: 30_000,
    retry: false,
    queryFn: () => api("/billing/quote", { method: "POST", body: { plan } }),
  });

export function useClearDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/billing/discount", { method: "DELETE" }),
    onSuccess: () => refreshPlan(queryClient),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (plan) =>
      api("/billing/checkout", { method: "POST", body: { plan } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export const useAdminCoupons = (enabled) =>
  useQuery({
    queryKey: ["admin-coupons"],
    enabled,
    queryFn: () => api("/admin/coupons"),
  });

export function useCouponMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  return {
    create: useMutation({
      mutationFn: (body) => api("/admin/coupons", { method: "POST", body }),
      onSuccess: (c) => {
        refresh();
        toast.success(`Code ${c.code} created`);
      },
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }) =>
        api(`/admin/coupons/${id}`, { method: "PATCH", body }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id) => api(`/admin/coupons/${id}`, { method: "DELETE" }),
      onSuccess: refresh,
    }),
  };
}
