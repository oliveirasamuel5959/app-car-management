import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertAppointment } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useWorkshops(search?: string) {
  return useQuery({
    queryKey: [api.workshops.list.path, search],
    queryFn: async () => {
      const url = search 
        ? `${api.workshops.list.path}?search=${encodeURIComponent(search)}`
        : api.workshops.list.path;
        
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch workshops");
      return api.workshops.list.responses[200].parse(await res.json());
    },
  });
}

export function useWorkshop(id: number) {
  return useQuery({
    queryKey: [api.workshops.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.workshops.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch workshop details");
      return api.workshops.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useWorkshopReviews(workshopId: number) {
  return useQuery({
    queryKey: ['reviews', workshopId],
    queryFn: async () => {
      const url = buildUrl(api.reviews.list.path, { id: workshopId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return api.reviews.list.responses[200].parse(await res.json());
    },
    enabled: !!workshopId,
  });
}

export function useCreateAppointment() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertAppointment, "userId">) => {
      const res = await fetch(api.appointments.create.path, {
        method: api.appointments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to book appointment");
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Appointment Booked",
        description: "Your request has been sent to the workshop.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
