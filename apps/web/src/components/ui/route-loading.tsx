import { PageLoader } from "@/components/ui/page-loader";

export function RouteLoading({ title = "در حال بارگذاری..." }: { title?: string }) {
  return <PageLoader title={title} />;
}
