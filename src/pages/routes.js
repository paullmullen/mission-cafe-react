import React from "react";
import Recipes from "./Recipes";
import Reference from "./Reference";
import Checklists from "./Checklists";
import SafetyLog from "./SafetyLog";
import Inventory from "./Inventory";
import Specials from "./Specials";
import Calculator from "./Calculator";
import Maintenance from "./Maintenance";
import FeedbackList from "./FeedbackList";
import Associates from "./Associates";
import AdminHome from "./AdminHome";
import RecipeEditor from "./RecipeEditor";
import InventoryAdmin from "./InventoryAdmin";
import ManagerMessage from "./ManagerMessage";
import DisplayUpload from "./DisplayUpload";
import AdminGuard from "../components/admin/AdminGuard";

const protect = (Component) => () => (
  <AdminGuard>
    <Component />
  </AdminGuard>
);

const routes = [
  { path: "/", component: Recipes, title: "Recipes" },
  { path: "/reference", component: Reference, title: "Reference" },
  { path: "/checklists", component: Checklists, title: "Checklists" },
  { path: "/safetyLog", component: SafetyLog, title: "Safety Log" },
  { path: "/inventory", component: Inventory, title: "Inventory" },
  { path: "/specials", component: Specials, title: "Special Events" },
  { path: "/calculator", component: Calculator, title: "Drawer Calculator" },
  { path: "/maintenance", component: Maintenance, title: "Maintenance" },
  { path: "/feedbackList", component: FeedbackList, title: "Feedback Log" },
  { path: "/associate", component: Associates, title: "Associates" },
  { path: "/admin", component: AdminHome, title: "Admin" },
  {
    path: "/admin/recipes",
    component: protect(RecipeEditor),
    title: "Recipes",
    showInMenu: false,
  },
  {
    path: "/admin/inventory",
    component: protect(InventoryAdmin),
    title: "Inventory Administration",
    showInMenu: false,
  },
  {
    path: "/admin/message",
    component: protect(ManagerMessage),
    title: "Manager's Message",
    showInMenu: false,
  },
  {
    path: "/admin/displays",
    component: protect(DisplayUpload),
    title: "Menu Displays",
    showInMenu: false,
  },
];

export default routes;
