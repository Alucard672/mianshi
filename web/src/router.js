import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "./pages/LoginPage.vue";
import SharePage from "./pages/SharePage.vue";
import PublicPostPage from "./pages/PublicPostPage.vue";
import ApplyPage from "./pages/ApplyPage.vue";
import AdminLayout from "./pages/admin/AdminLayout.vue";
import AdminHome from "./pages/admin/AdminHome.vue";
import AdminUsers from "./pages/admin/AdminUsers.vue";
import AdminQuestions from "./pages/admin/AdminQuestions.vue";
import AdminJobs from "./pages/admin/AdminJobs.vue";
import AdminPosts from "./pages/admin/AdminPosts.vue";
import AdminAudit from "./pages/admin/AdminAudit.vue";
import AdminApplicants from "./pages/admin/AdminApplicants.vue";
import AdminNotifications from "./pages/admin/AdminNotifications.vue";

function hasEmployeeToken() {
  return Boolean(String(localStorage.getItem("employee_token") || "").trim());
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", component: LoginPage },
    { path: "/share/:token", component: SharePage },
    { path: "/post/:slug", component: PublicPostPage },
    { path: "/post/:slug/apply", component: ApplyPage },
    {
      path: "/admin",
      component: AdminLayout,
      meta: { requiresAuth: true },
      redirect: "/admin/home",
      children: [
        { path: "home", component: AdminHome },
        { path: "notifications", component: AdminNotifications },
        { path: "users", component: AdminUsers },
        { path: "applicants", component: AdminApplicants },
        { path: "questions", component: AdminQuestions },
        { path: "jobs", component: AdminJobs },
        { path: "posts", component: AdminPosts },
        { path: "audit", component: AdminAudit }
      ]
    }
  ]
});

router.beforeEach((to) => {
  if (to.meta?.requiresAuth && !hasEmployeeToken()) {
    return { path: "/login", query: { next: to.fullPath } };
  }
  return true;
});

export default router;
