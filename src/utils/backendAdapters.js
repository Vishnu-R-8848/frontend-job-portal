export const extractList = (data, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }
  return Array.isArray(data) ? data : [];
};

export const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const getId = (item) => item?.id || item?._id;

export const sameId = (left, right) => String(left) === String(right);

export const hasId = (ids, id) => (ids || []).some((item) => sameId(item, id));

export const normalizeUser = (user = {}) => ({
  ...user,
  id: user.id || user._id,
  firstName: user.firstName || user.first_name || "",
  lastName: user.lastName || user.last_name || "",
  role:
    user.is_superuser || user.is_staff
      ? "admin"
      : user.role === "seeker"
        ? "candidate"
        : user.role,
  isSuspended:
    user.isSuspended !== undefined ? user.isSuspended : user.is_active === false,
});

export const normalizeProfile = (profile = {}) => {
  const user = normalizeUser(profile.user || profile);
  const skills = toArray(profile.skills);

  return {
    ...profile,
    user,
    id: profile.id || profile._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: profile.email || user.email,
    role: user.role || (profile.role === "seeker" ? "candidate" : profile.role),
    fullName: profile.full_name || `${user.firstName} ${user.lastName}`.trim(),
    image: profile.profile_picture || profile.profilePicture,
    profileImage: profile.profile_picture || profile.profileImage,
    linkedin: profile.linkedin_url || profile.linkedin,
    github: profile.github_url || profile.github,
    portfolio: profile.portfolio_url || profile.portfolio,
    company: profile.company_name || profile.company,
    companyName: profile.company_name || profile.companyName,
    companyWebsite: profile.company_website || profile.companyWebsite,
    skills,
    candidateProfile: {
      ...(profile.candidateProfile || {}),
      skills,
      appliedJobs: user.appliedJobs || profile.appliedJobs || [],
      savedJobs: user.savedJobs || profile.savedJobs || [],
    },
  };
};

export const normalizeJob = (job = {}) => ({
  ...job,
  id: job.id || job._id,
  jobType: job.job_type || job.jobType,
  type: job.job_type || job.jobType,
  isRemote: job.is_remote ?? job.isRemote,
  salaryMin: job.salary_min ?? job.salaryMin,
  salaryMax: job.salary_max ?? job.salaryMax,
  skillsRequired: toArray(job.skills_required || job.skillsRequired || job.skills),
  requirements: toArray(job.skills_required || job.requirements || job.skillsRequired),
  postedBy: job.posted_by || job.postedBy,
  createdAt: job.created_at || job.createdAt,
  updatedAt: job.updated_at || job.updatedAt,
  isInternal: true,
});

export const jobToBackendPayload = (data = {}) => ({
  title: data.title,
  company: data.company,
  description: data.description,
  location: data.location,
  is_remote:
    data.isRemote ??
    data.is_remote ??
    (data.jobType === "remote" ||
      String(data.location || "").toLowerCase().includes("remote")),
  job_type: data.jobType || data.job_type || "full_time",
  salary_min: data.salaryMin || data.salary_min || null,
  salary_max: data.salaryMax || data.salary_max || null,
  skills_required: toArray(data.skillsRequired || data.skills_required || data.requirements),
});

export const profileToBackendPayload = (data = {}, role) => {
  const payload = {
    phone: data.phone || "",
    address: data.address || data.location || "",
    bio: data.bio || data.headline || "",
    linkedin_url: data.linkedin || data.linkedin_url || "",
    github_url: data.github || data.github_url || "",
    portfolio_url: data.portfolio || data.website || data.portfolio_url || "",
  };

  if (role === "hr") {
    payload.company_name = data.companyName || data.company || data.company_name || "";
    payload.company_website = data.companyWebsite || data.company_website || "";
    payload.designation = data.designation || data.headline || "";
  } else {
    payload.skills = toArray(data.skills);
    payload.experience = data.experience || "";
    payload.education = data.education || "";
  }

  return payload;
};
