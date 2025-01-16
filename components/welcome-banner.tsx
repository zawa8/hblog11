import Image from "next/image";
import { auth, currentUser } from "@clerk/nextjs";

export const WelcomeBanner = async () => {
  const user = await currentUser();
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Student";

  return (
    <div className="relative w-full h-[200px] bg-violet-50 rounded-xl p-8 flex items-center gap-x-8 overflow-hidden">
      <div className="h-full aspect-square relative">
        <Image
          src="/mascot-doctor.png"
          alt="Panda Doctor Mascot"
          fill
          className="object-contain"
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome Back,{" "}
          <span className="text-violet-600">
            {fullName}
          </span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Let&apos;s Begin Learning where you left off,
        </p>
        <p className="text-muted-foreground text-lg">
          Keep it up and improve your progress
        </p>
      </div>
    </div>
  );
};
