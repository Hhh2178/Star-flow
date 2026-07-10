import axios from "@/utils/axios";
import type { UserRole } from "@/shared/auth";
import { stopAllGenerationJobTracking } from "@/utils/generationJobTracker";
import { stopAllAgentJobTracking } from "@/utils/agentJobTracker";

export type { UserRole } from "@/shared/auth";
export type UserStatus = "enabled" | "disabled";

export interface CurrentUser {
  id: number;
  name: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
}

export default defineStore(
  "user",
  () => {
    const token = ref(localStorage.getItem("token"));
    const currentUser = ref<CurrentUser | null>(null);
    const loading = ref(false);

    function setToken(nextToken: string) {
      token.value = nextToken;
      localStorage.setItem("token", nextToken);
    }

    async function fetchCurrentUser() {
      loading.value = true;
      try {
        const response = await axios.get("/setting/loginConfig/me");
        currentUser.value = response.data;
        return currentUser.value;
      } finally {
        loading.value = false;
      }
    }

    function clearSession() {
      stopAllGenerationJobTracking();
      stopAllAgentJobTracking();
      token.value = null;
      currentUser.value = null;
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
    }

    return { token, currentUser, loading, setToken, fetchCurrentUser, clearSession };
  },
  { persist: false },
);
