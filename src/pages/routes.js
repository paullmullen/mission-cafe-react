import Recipes from "./Recipes";
import Reference from "./Reference";
import Checklists from "./Checklists";
import SafetyLog from "./SafetyLog";
import Inventory from "./Inventory";
import Specials from "./Specials";
import Calculator from "./Calculator";
import Maintenance from "./Maintenance";
import ManagerMessage from "./ManagerMessage";
import FeedbackList from "./FeedbackList";
import Associates from "./Associates";

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
  {
    path: "/managerMessage",
    component: ManagerMessage,
    title: "Manager's Message",
  },
  { path: "/associate", component: Associates, title: "Associates" },
];

export default routes;
