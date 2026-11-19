import { company, initialsOf } from "./config";

/** Logotipo de la empresa en documentos: la imagen configurada o sus iniciales */
export default function CompanyLogo({ className = "" }: { className?: string }) {
  if (company.logo)
    return <img src={company.logo} alt={company.commercialName} className={`${className.replace(/bg-\[#183b36\]/, "")} bg-white object-contain`} />;
  return <span className={className}>{initialsOf(company.commercialName)}</span>;
}
