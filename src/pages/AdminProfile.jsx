import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import api from "../config/api";

const normalizeUser = (user) => ({
  id: user.id || user._id,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  email: user.email || "",
  role: user.role || "candidate",
  isSuspended: Boolean(user.isSuspended),
  company:
    user.profile?.companyName ||
    user.profile?.company ||
    user.companyName ||
    user.company ||
    "Company unavailable",
  jobsCount: user.jobsCount || 0,
});

const AdminProfile = () => {
  const [users, setUsers] = useState([]);
  const [hrs, setHrs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, hrsRes, candidatesRes] = await Promise.all([
        api.get("/admin/users/"),
        api.get("/admin/hrs/"),
        api.get("/admin/candidates/"),
      ]);

      setUsers((usersRes.data?.users || []).map(normalizeUser));
      setHrs((hrsRes.data?.hrs || []).map(normalizeUser));
      setCandidates((candidatesRes.data?.candidates || []).map(normalizeUser));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load admin data");
      setUsers([]);
      setHrs([]);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleSuspendToggle = async (user) => {
    const endpoint = user.isSuspended ? "unsuspend" : "suspend";
    setActionId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/${endpoint}/`);
      toast.success(user.isSuspended ? "User unsuspended" : "User suspended");
      await fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update user status");
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.firstName || user.email}? This also removes their profile and jobs.`)) {
      return;
    }

    setActionId(user.id);
    try {
      await api.delete(`/admin/users/${user.id}/`);
      toast.success("User deleted");
      await fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete user");
    } finally {
      setActionId("");
    }
  };

  const renderStatus = (user) =>
    user.isSuspended ? (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full uppercase">
        <Ban className="w-3 h-3" /> Suspended
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full uppercase">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    );

  const renderTable = (title, list, icon, showCompany = false) => (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-border bg-muted/20 flex justify-between items-center">
        <h2 className="text-xl font-black text-foreground flex items-center gap-2">
          {icon} {title}
        </h2>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          Total: {list.length}
        </span>
      </div>

      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              {showCompany && <th className="px-6 py-4">Company</th>}
              {showCompany && <th className="px-6 py-4 text-center">Jobs</th>}
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={showCompany ? 6 : 4}
                  className="px-6 py-12 text-center text-muted-foreground italic font-medium"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              list.map((user) => (
                <tr
                  key={user.id}
                  className={`transition-colors group ${user.isSuspended ? "bg-destructive/5" : "hover:bg-muted/20"}`}
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-6 py-4 capitalize font-bold text-sm text-muted-foreground">
                    {user.role}
                  </td>
                  {showCompany && (
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-sm bg-secondary px-3 py-1.5 rounded-lg border border-border/50">
                        <Building2 className="w-3.5 h-3.5 text-primary" /> {user.company}
                      </span>
                    </td>
                  )}
                  {showCompany && (
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-lg text-foreground">{user.jobsCount}</span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">{renderStatus(user)}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleSuspendToggle(user)}
                      disabled={actionId === user.id}
                      className={`p-2 transition-colors rounded-lg disabled:opacity-50 ${
                        user.isSuspended
                          ? "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20"
                          : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                      }`}
                      title={user.isSuspended ? "Unsuspend user" : "Suspend user"}
                    >
                      {actionId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={actionId === user.id}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-primary bg-card border border-border rounded-3xl mt-8">
        <Loader2 className="animate-spin w-8 h-8 mb-2" />
        <span className="font-bold">Fetching secure data...</span>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {renderTable(
        "All Users",
        users,
        <ShieldAlert className="w-5 h-5 text-destructive" />,
      )}
      {renderTable(
        "HR Users",
        hrs,
        <Users className="w-5 h-5 text-primary" />,
        true,
      )}
      {renderTable(
        "Candidate Users",
        candidates,
        <UserRound className="w-5 h-5 text-primary" />,
      )}
    </div>
  );
};

export default AdminProfile;
