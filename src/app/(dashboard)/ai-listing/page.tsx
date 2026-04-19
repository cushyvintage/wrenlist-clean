import { redirect } from 'next/navigation'

// The standalone /ai-listing page was removed in favour of an inline
// "Wren AI" panel on the find detail page. Any lingering bookmarks
// land on the inventory list.
export default function AIListingPage() {
  redirect('/finds')
}
