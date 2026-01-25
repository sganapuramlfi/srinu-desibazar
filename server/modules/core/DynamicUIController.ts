import { UserSession } from "./ModuleAwareAuth.js";

export class DynamicUIController {
  async generateNavigation(session: UserSession) {
    const baseNav = [
      { id: "dashboard", label: "Dashboard", path: "/dashboard" },
      { id: "profile", label: "Profile", path: "/profile" }
    ];

    // Add module-specific navigation
    if (session.enabledModules.includes("restaurant")) {
      baseNav.push(
        { id: "tables", label: "Tables", path: "/tables" },
        { id: "menu", label: "Menu", path: "/menu" },
        { id: "bookings", label: "Bookings", path: "/bookings" }
      );
    }

    if (session.enabledModules.includes("salon")) {
      baseNav.push(
        { id: "services", label: "Services", path: "/services" },
        { id: "staff", label: "Staff", path: "/staff" },
        { id: "appointments", label: "Appointments", path: "/appointments" }
      );
    }

    return baseNav;
  }

  async generateDashboard(session: UserSession) {
    return {
      layout: "grid",
      widgets: [
        { id: "stats", type: "stats", title: "Business Overview" },
        { id: "recent", type: "list", title: "Recent Activity" }
      ]
    };
  }

  async getFormFields(formType: string, session: UserSession) {
    const baseFields = [
      { name: "name", type: "text", label: "Name", required: true },
      { name: "description", type: "textarea", label: "Description" }
    ];

    return baseFields;
  }

  async getAvailableComponents(session: UserSession) {
    return [
      { id: "table", name: "Table Component" },
      { id: "form", name: "Form Component" },
      { id: "chart", name: "Chart Component" }
    ];
  }

  async generateModuleStatusNotification(moduleId: string, status: string) {
    return {
      type: "success",
      title: `Module ${status}`,
      message: `${moduleId} module has been ${status} successfully`
    };
  }
}