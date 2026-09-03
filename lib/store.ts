import { create } from "zustand";

import type { UserRole } from "@/lib/types";

interface OpsState {
  selectedRole: UserRole;
  selectedVehicleId: string | null;
  mapFilter: "all" | "alerts" | "service";
  setSelectedRole: (role: UserRole) => void;
  setSelectedVehicleId: (vehicleId: string | null) => void;
  setMapFilter: (filter: OpsState["mapFilter"]) => void;
}

export const useOpsStore = create<OpsState>((set) => ({
  selectedRole: "Dispatcher",
  selectedVehicleId: null,
  mapFilter: "all",
  setSelectedRole: (role) => set({ selectedRole: role }),
  setSelectedVehicleId: (vehicleId) => set({ selectedVehicleId: vehicleId }),
  setMapFilter: (filter) => set({ mapFilter: filter }),
}));
