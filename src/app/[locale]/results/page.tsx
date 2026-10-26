import {getTranslations} from "next-intl/server";
export const dynamic="force-dynamic";
export default async function ResultsPage(){const t=await getTranslations("publicResults");return <><h1 className="text-3xl font-bold">{t("title")}</h1><p className="max-w-2xl text-muted-foreground">{t("unlisted")}</p></>;}
