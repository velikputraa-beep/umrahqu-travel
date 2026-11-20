import React from "react";
import PackageForm from "@/components/travel/package-form";
import { savePackage } from "@/lib/data/package-actions";
import { PACKAGE_LIST_PATH } from "@/lib/data/packages";

export default function BaruPaketPage() {
  return <PackageForm action={savePackage} backHref={PACKAGE_LIST_PATH} />;
}
