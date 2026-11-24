import { redirect } from 'next/navigation'

// "My jobs and hires" is gone: service work now lives on the contracts page. Old links and bookmarks land there.
export default function Page() {
  redirect('/contracts')
}
