import { LinkButton } from "@/components/ui/link-button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProductNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <EmptyState
        title="محصول پیدا نشد"
        description="محصول مورد نظر وجود ندارد یا در حال حاضر فعال نیست."
        actions={<LinkButton href="/products">مشاهده محصولات</LinkButton>}
      />
    </main>
  );
}
