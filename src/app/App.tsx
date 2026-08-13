import { RouterProvider } from "react-router-dom";
import { router } from "./router.tsx";

export function RootApp() {
  return <RouterProvider router={router} />;
}
