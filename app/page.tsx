import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthButtonServer from "./components/auth-button-server";
import DomainsList from "./components/domains-list";
import ServiceAccountButton from './components/service-account-button';
import VerifyButton from "./components/verify-button";
import CreatePrivateKey from "./components/create-private-key";


export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  // The next 7 lines (including the space in between) is how you protect routes from logged out users
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <h1>Logged in!</h1>
      <DomainsList />
      <ServiceAccountButton />
      {/* <VerifyButton /> */}
      <CreatePrivateKey />
      <AuthButtonServer />
    </>
  );
}

