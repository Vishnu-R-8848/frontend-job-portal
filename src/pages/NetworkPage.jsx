import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../config/api";
import { extractList, normalizeUser } from "../utils/backendAdapters";
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Building2,
  MapPin,
  Loader2,
  Briefcase,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router";

const NetworkPage = () => {
  const navigate = useNavigate();
  const [networkUsers, setNetworkUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");

  const normalizeNetworkUser = (networkUser) => {
    const user = normalizeUser(networkUser.user || networkUser);
    const name = networkUser.full_name || user.name || `${user.firstName} ${user.lastName}`.trim();

    return {
      id: user.id || networkUser.id || networkUser._id,
      name,
      email: user.email,
      role: user.role,
      company: networkUser.company || networkUser.companyName,
      location: networkUser.location,
      mutual: networkUser.mutual || 0,
      isFollowing: Boolean(networkUser.isFollowing),
    };
  };

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchNetwork = async () => {
      setIsLoading(true);
      try {
        const [suggestedRes, followingRes, followersRes] = await Promise.allSettled([
          api.get("/network/suggested/"),
          api.get("/network/my/following/"),
          api.get("/network/my/followers/"),
        ]);
        const suggested = suggestedRes.status === "fulfilled"
          ? extractList(suggestedRes.value.data, ["users", "results"])
          : [];
        const following = followingRes.status === "fulfilled"
          ? extractList(followingRes.value.data, ["users", "results"])
          : [];
        const followers = followersRes.status === "fulfilled"
          ? extractList(followersRes.value.data, ["users", "results"])
          : [];

        setNetworkUsers([
          ...suggested.map((item) => ({ ...normalizeNetworkUser(item), isFollowing: false })),
          ...following.map((item) => ({ ...normalizeNetworkUser(item), isFollowing: true })),
          ...followers.map((item) => ({ ...normalizeNetworkUser(item), isFollower: true })),
        ]);
      } catch (error) {
        toast.error(error.response?.data?.message || "Network suggestions are not available yet.");
        setNetworkUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNetwork();
  }, []);

  // --- 2. HANDLERS ---
  const handleToggleFollow = async (userId, userName, currentState) => {
    try {
      setNetworkUsers((prevUsers) =>
        prevUsers.map((user) =>
          (user.id || user._id) === userId ? { ...user, isFollowing: !currentState } : user,
        ),
      );
      const response = await api.post(`/network/follow/${userId}/`);
      const followed = Boolean(response.data?.followed);
      setNetworkUsers((prevUsers) =>
        prevUsers.map((user) =>
          (user.id || user._id) === userId ? { ...user, isFollowing: followed } : user,
        ),
      );

      if (followed) {
        toast.success(`You are now following ${userName}`);
      } else {
        toast(`Unfollowed ${userName}`);
      }
    } catch (error) {
      setNetworkUsers((prevUsers) =>
        prevUsers.map((user) =>
          (user.id || user._id) === userId ? { ...user, isFollowing: currentState } : user,
        ),
      );
      toast.error(error.response?.data?.message || "Follow service is not available yet.");
    }
  };

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/network/search/?p=${encodeURIComponent(trimmedQuery)}`);
        const results = extractList(res.data, ["users", "results"]).map((item) => ({
          ...normalizeNetworkUser(item),
          isSearchResult: true,
        }));
        setNetworkUsers((prev) => {
          const existingIds = new Set(prev.map((item) => String(item.id)));
          return [
            ...prev,
            ...results.filter((item) => !existingIds.has(String(item.id))),
          ];
        });
      } catch {
        // Local filtering still works if backend search fails.
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartConversation = async (userId) => {
    try {
      await api.post(`/messaging/start/${userId}/`);
      navigate("/messages");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start conversation");
    }
  };

  // --- 3. FILTER LOGIC ---
  const filteredUsers = networkUsers.filter((user) => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.company || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "discover"
        ? true
        : activeTab === "following"
          ? user.isFollowing
          : user.isFollower;

    return matchesSearch && matchesTab;
  });

  // --- RENDER UI ---
  return (
    <div className="min-h-screen bg-background pb-20 pt-8 px-4 sm:px-6 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* --- HEADER & SEARCH --- */}
        <div className="bg-card border-2 border-border rounded-[32px] p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="text-center lg:text-left w-full lg:w-auto">
              <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2 flex items-center justify-center lg:justify-start gap-3">
                <Users className="w-8 h-8 text-primary" /> My Network
              </h1>
              <p className="text-muted-foreground font-medium">
                Connect with industry professionals and recruiters.
              </p>
            </div>

            <div className="w-full lg:w-96 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, role, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-muted/50 border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
              />
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-border mt-8 gap-6">
            {[
              ["discover", "Discover"],
              ["following", `Following (${networkUsers.filter((u) => u.isFollowing).length})`],
              ["followers", `Followers (${networkUsers.filter((u) => u.isFollower).length})`],
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`pb-4 text-sm font-black tracking-wider uppercase transition-colors relative ${activeTab === tabKey ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
                {activeTab === tabKey && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="font-bold">Loading network...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id || user._id}
                className="bg-card border-2 border-border rounded-[24px] p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group flex flex-col"
              >
                {/* User Avatar & Info */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-4 border-4 border-background shadow-sm group-hover:scale-105 transition-transform">
                    <span className="text-2xl font-black text-primary uppercase">
                      {(user.name || user.email || "U").charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-foreground mb-1 leading-tight">
                    {user.name || user.email || "User"}
                  </h3>
                  <p className="text-sm font-bold text-muted-foreground line-clamp-1">
                    {user.role || "Professional"}
                  </p>
                </div>

                {/* Company & Location Badges */}
                <div className="flex flex-col gap-2 mb-6 mt-auto">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground bg-muted/50 px-3 py-2 rounded-xl border border-border">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{user.company || "Company unavailable"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/20 px-3 py-2 rounded-xl border border-border">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{user.location || "Location unavailable"}</span>
                  </div>
                </div>

                {/* Mutuals & Action Button */}
                <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                  <div className="text-xs font-bold text-muted-foreground">
                    {user.mutual > 0 ? (
                      <span>
                        <span className="text-foreground">{user.mutual}</span>{" "}
                        mutuals
                      </span>
                    ) : (
                      <span>New connection</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartConversation(user.id || user._id)}
                    className="p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shadow-sm shrink-0 bg-secondary text-secondary-foreground border-2 border-border hover:bg-muted"
                    title="Message"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      handleToggleFollow(user.id || user._id, user.name || user.email, user.isFollowing)
                    }
                    className={`p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shadow-sm shrink-0
                      ${
                        user.isFollowing
                          ? "bg-secondary text-secondary-foreground border-2 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    title={user.isFollowing ? "Unfollow" : "Follow"}
                  >
                    {user.isFollowing ? (
                      <UserCheck className="w-5 h-5" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-[32px] bg-muted/10">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-border">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">
              No users found
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {activeTab === "following"
                ? "You aren't following anyone that matches this search."
                : "Network suggestions are not available yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkPage;
