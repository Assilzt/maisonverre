import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router";
import { lazy, Suspense } from "react";
import HomePage from "@/react-app/pages/Home";
import { getProductConfig } from "@/react-app/product-config";

const Dashboard = lazy(() => import("@/react-app/pages/Dashboard"));

function ProductLandingRoute() {
  const { slug } = useParams();
  const product = getProductConfig(slug);

  if (!product) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-orange-50 px-6 text-center"
        dir="rtl"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            الصفحة غير موجودة
          </h1>
          <p className="mt-2 text-slate-600">
            تأكد من رابط المنتج وحاول مرة أخرى.
          </p>
        </div>
      </main>
    );
  }

  return <HomePage product={product} />;
}

export default function App() {
  const isDashboard =
    new URLSearchParams(window.location.search).get("dashboard") === "orders";

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isDashboard ? (
              <Suspense fallback={<div className="min-h-screen bg-orange-50" />}>
                <Dashboard />
              </Suspense>
            ) : (
              <HomePage />
            )
          }
        />
        <Route path="/ecom12" element={<HomePage design="ecom12" />} />
        <Route path="/p/:slug" element={<ProductLandingRoute />} />
      </Routes>
    </Router>
  );
}
