import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

async function checkSetup() {
  try {
    const userCount = await prisma.user.count()
    return userCount === 0
  } catch (error) {
    // En cas d'erreur, rediriger vers login
    return false
  }
}

export default async function Home() {
  const needsSetup = await checkSetup()
  
  if (needsSetup) {
    redirect("/setup")
  } else {
    redirect("/login")
  }
}

