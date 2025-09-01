import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="SignUp"
        description="This is the SignUp page for our application"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
