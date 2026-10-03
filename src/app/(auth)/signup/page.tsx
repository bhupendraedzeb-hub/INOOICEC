import Link from "next/link";
import { signIn } from "@/lib/auth/auth";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

export default function SignupPage() {
  async function signupWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Create your organization</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          This creates a brand-new, fully isolated workspace — you&apos;ll be its owner and can invite teammates
          afterward from Settings.
        </p>

        <form action={signupWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-400 dark:text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <SignupForm />
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-900 hover:underline dark:text-zinc-50">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
