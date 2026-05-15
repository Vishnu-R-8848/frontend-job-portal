import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../config/api";
import { normalizeProfile, normalizeUser as normalizeBackendUser } from "../utils/backendAdapters";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

const normalizeUser = (payload) => {
  const raw = payload?.data || payload;
  const account = raw?.user || raw;

  if (!account) {
    return null;
  }

  const user = normalizeBackendUser({
    ...(raw?.profile || raw || {}),
    ...(account || {}),
  });
  const profile = normalizeProfile(raw?.profile || raw || user);
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const role = user.role;

  return {
    ...user,
    profile: raw?.profile || user.profile || null,
    firstName,
    lastName,
    role,
    displayRole: role === "candidate" ? "Candidate" : role,
    image:
      user.image ||
      user.profileImage ||
      profile?.profileImage,
    github: user.github || profile?.github,
    linkedin: user.linkedin || profile?.linkedin,
    portfolio: user.portfolio || profile?.portfolio,
    company: user.company || user.companyName || profile?.companyName,
    phone: user.phone || profile?.phone,
    location: user.location || user.address || profile?.address,
    bio: user.bio || profile?.bio,
    skills: user.skills || profile?.skills || [],
    candidateProfile: {
      ...(user.candidateProfile || {}),
      appliedJobs:
        user.candidateProfile?.appliedJobs ||
        user.appliedJobs ||
        profile?.candidateProfile?.appliedJobs ||
        [],
      savedJobs:
        user.candidateProfile?.savedJobs ||
        user.savedJobs ||
        profile?.candidateProfile?.savedJobs ||
        [],
      skills: user.candidateProfile?.skills || profile?.skills || [],
    },
    notifications: user.notifications || [],
  };
};

const persistUser = (user) => {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.response?.data?.detail ||
  fallback;

export const applyForJobAsync = createAsyncThunk(
  "isAuth/applyForJobAsync",
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/applications/apply/auto/${jobId}/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to apply"));
    }
  },
);

export const saveJobAsync = createAsyncThunk(
  "isAuth/saveJobAsync",
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/jobs/${jobId}/save/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to save job"));
    }
  },
);

export const unsaveJobAsync = createAsyncThunk(
  "isAuth/unsaveJobAsync",
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/jobs/${jobId}/save/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to remove saved job"));
    }
  },
);

const withoutUndefined = (value) =>
  Object.fromEntries(
    Object.entries(value || {}).filter(([, fieldValue]) => fieldValue !== undefined),
  );

const addUniqueId = (list, id) => {
  const normalizedId = String(id);
  if (!list.some((item) => String(item) === normalizedId)) {
    list.push(id);
  }
};

const removeId = (list, id) => {
  const normalizedId = String(id);
  return list.filter((item) => String(item) !== normalizedId);
};

const initialState = {
  user: getStoredUser(),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  isProfileComplete: false,
  loading: false,
};

const authSlice = createSlice({
  name: "isAuth",

  initialState,

  reducers: {
    addUser: (state, action) => {
      state.user = normalizeUser(action.payload);
      state.isAuthenticated = true;

      state.isProfileComplete =
        !!state.user?.profile ||
        !!state.user?.profileCompleted ||
        !!state.user?.isProfileComplete;

      persistUser(state.user);
    },

    removeUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isProfileComplete = false;

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    },

    updateUser: (state, action) => {
      const updatedUser = normalizeUser(action.payload);
      state.user = {
        ...state.user,
        ...withoutUndefined(updatedUser),
      };

      state.isProfileComplete =
        !!state.user?.profile ||
        !!state.user?.profileCompleted ||
        !!state.user?.isProfileComplete;

      persistUser(state.user);
    },

    applyForJob: (state, action) => {
      const jobId = action.payload;

      if (state.user) {
        if (!state.user.candidateProfile) {
          state.user.candidateProfile = {};
        }

        if (!state.user.candidateProfile.appliedJobs) {
          state.user.candidateProfile.appliedJobs = [];
        }

        addUniqueId(state.user.candidateProfile.appliedJobs, jobId);

        persistUser(state.user);
      }
    },

    saveJob: (state, action) => {
      const jobId = action.payload;

      if (state.user) {
        if (!state.user.candidateProfile) {
          state.user.candidateProfile = {};
        }

        if (!state.user.candidateProfile.savedJobs) {
          state.user.candidateProfile.savedJobs = [];
        }

        addUniqueId(state.user.candidateProfile.savedJobs, jobId);

        persistUser(state.user);
      }
    },

    unsaveJob: (state, action) => {
      const jobId = action.payload;

      if (state.user?.candidateProfile?.savedJobs) {
        state.user.candidateProfile.savedJobs = removeId(
          state.user.candidateProfile.savedJobs,
          jobId,
        );

        persistUser(state.user);
      }
    },

    addNotification: (state, action) => {
      if (state.user) {
        if (!state.user.notifications) {
          state.user.notifications = [];
        }

        state.user.notifications.unshift({
          id: Date.now().toString(),
          message: action.payload.message,
          type: action.payload.type || "info",
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        persistUser(state.user);
      }
    },

    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;

      if (state.user?.notifications) {
        const notification = state.user.notifications.find(
          (n) => n.id === notificationId,
        );

        if (notification) {
          notification.isRead = true;
          persistUser(state.user);
        }
      }
    },

    clearAllNotifications: (state) => {
      if (state.user) {
        state.user.notifications = [];
        persistUser(state.user);
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(applyForJobAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(applyForJobAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.candidateProfile ||= {};
          state.user.candidateProfile.appliedJobs ||= [];
          addUniqueId(state.user.candidateProfile.appliedJobs, action.meta.arg);
          persistUser(state.user);
        }
      })
      .addCase(applyForJobAsync.rejected, (state) => {
        state.loading = false;
      })
      .addCase(saveJobAsync.fulfilled, (state, action) => {
        if (state.user) {
          state.user.candidateProfile ||= {};
          state.user.candidateProfile.savedJobs ||= [];
          addUniqueId(state.user.candidateProfile.savedJobs, action.meta.arg);
          persistUser(state.user);
        }
      })
      .addCase(unsaveJobAsync.fulfilled, (state, action) => {
        if (state.user?.candidateProfile?.savedJobs) {
          state.user.candidateProfile.savedJobs = removeId(
            state.user.candidateProfile.savedJobs,
            action.meta.arg,
          );
          persistUser(state.user);
        }
      });
  },
});

export const {
  addUser,
  removeUser,
  updateUser,
  applyForJob,
  saveJob,
  unsaveJob,
  addNotification,
  markNotificationAsRead,
  clearAllNotifications,
} = authSlice.actions;

export default authSlice.reducer;
