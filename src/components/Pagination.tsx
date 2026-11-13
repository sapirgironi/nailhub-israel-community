import { Button } from "./ui/button";

export const PAGE_SIZE = 25;

export function pageRange(page: number) {
  const from = page * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE };
}

export function Pagination({
  page,
  onPageChange,
  hasNext,
  loading,
}: {
  page: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  loading: boolean;
}) {
  return (
    <nav aria-label="ניווט בין עמודים" className="flex items-center justify-center gap-3 py-3">
      <Button type="button" variant="outline" disabled={loading || page === 0} onClick={() => onPageChange(page - 1)}>הקודם</Button>
      <span className="text-sm">עמוד {page + 1}</span>
      <Button type="button" variant="outline" disabled={loading || !hasNext} onClick={() => onPageChange(page + 1)}>הבא</Button>
    </nav>
  );
}
