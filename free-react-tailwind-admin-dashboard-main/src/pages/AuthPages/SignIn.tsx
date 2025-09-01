import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="SignIn"
        description="This is the SignIn page for our application"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
