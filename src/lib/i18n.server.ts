/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * Multi-Language Support System (i18n)
 * Supports: English, Spanish, Portuguese, French, German
 * ============================================================================
 */

export type Language = "en" | "es" | "pt" | "fr" | "de";

export const SUPPORTED_LANGUAGES: Record<Language, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

/**
 * Complete translation dictionary for all platform features
 */
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.contractors": "Contractors",
    "nav.estimates": "Estimates",
    "nav.proposals": "Proposals",
    "nav.media": "Media",
    "nav.documents": "Documents",
    "nav.materials": "Materials",
    "nav.settings": "Settings",
    "nav.logout": "Logout",

    // Contractor Dashboard
    "contractor.dashboard.title": "Contractor Dashboard",
    "contractor.dashboard.subtitle": "Manage your profile, projects, and performance",
    "contractor.profile": "Profile",
    "contractor.projects": "Projects",
    "contractor.performance": "Performance",
    "contractor.documents": "Documents",
    "contractor.settings": "Settings",

    // Authentication
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirm_password": "Confirm Password",
    "auth.phone": "Phone Number",
    "auth.company_name": "Company Name",
    "auth.trade": "Trade/Specialty",
    "auth.language": "Preferred Language",
    "auth.login_success": "Login successful",
    "auth.register_success": "Account created successfully",
    "auth.invalid_credentials": "Invalid email or password",

    // Documents
    "document.upload": "Upload Document",
    "document.license": "Contractor License",
    "document.liability": "General Liability Insurance",
    "document.workers_comp": "Workers' Compensation Insurance",
    "document.surety_bond": "Surety Bond",
    "document.verified": "Verified",
    "document.pending": "Pending",
    "document.expired": "Expired",
    "document.expiration_date": "Expiration Date",
    "document.upload_new": "Upload New Document",

    // Materials Marketplace
    "materials.title": "Materials Marketplace",
    "materials.discount": "Contractor Discount",
    "materials.price": "Price",
    "materials.quantity": "Quantity",
    "materials.add_to_estimate": "Add to Estimate",
    "materials.search": "Search Materials",
    "materials.category": "Category",
    "materials.glazing": "Glazing",
    "materials.hardware": "Hardware",
    "materials.sealants": "Sealants",
    "materials.tools": "Tools",

    // Proposals
    "proposal.create": "Create Proposal",
    "proposal.title": "Proposal",
    "proposal.status": "Status",
    "proposal.amount": "Amount",
    "proposal.date": "Date",
    "proposal.share": "Share Proposal",
    "proposal.send_link": "Send Link to Client",
    "proposal.client_portal": "Client Portal",

    // Client Portal
    "client.view_proposal": "View Proposal",
    "client.accept": "Accept",
    "client.decline": "Decline",
    "client.message": "Message Contractor",
    "client.schedule": "Schedule",
    "client.contact": "Contact Information",

    // Performance Metrics
    "performance.acceptance_rate": "Acceptance Rate",
    "performance.success_rate": "Success Rate",
    "performance.quality_score": "Quality Score",
    "performance.revenue": "Revenue Generated",
    "performance.projects_completed": "Projects Completed",
    "performance.client_satisfaction": "Client Satisfaction",

    // Compliance
    "compliance.status": "Compliance Status",
    "compliance.verified": "Verified",
    "compliance.pending_review": "Pending Review",
    "compliance.renewal_due": "Renewal Due",
    "compliance.audit_trail": "Audit Trail",

    // General
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.submit": "Submit",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.warning": "Warning",
    "common.info": "Information",
  },

  es: {
    // Navigation
    "nav.dashboard": "Panel de Control",
    "nav.contractors": "Contratistas",
    "nav.estimates": "Presupuestos",
    "nav.proposals": "Propuestas",
    "nav.media": "Medios",
    "nav.documents": "Documentos",
    "nav.materials": "Materiales",
    "nav.settings": "Configuración",
    "nav.logout": "Cerrar Sesión",

    // Contractor Dashboard
    "contractor.dashboard.title": "Panel del Contratista",
    "contractor.dashboard.subtitle": "Gestiona tu perfil, proyectos y desempeño",
    "contractor.profile": "Perfil",
    "contractor.projects": "Proyectos",
    "contractor.performance": "Desempeño",
    "contractor.documents": "Documentos",
    "contractor.settings": "Configuración",

    // Authentication
    "auth.login": "Iniciar Sesión",
    "auth.register": "Registrarse",
    "auth.email": "Correo Electrónico",
    "auth.password": "Contraseña",
    "auth.confirm_password": "Confirmar Contraseña",
    "auth.phone": "Número de Teléfono",
    "auth.company_name": "Nombre de la Empresa",
    "auth.trade": "Oficio/Especialidad",
    "auth.language": "Idioma Preferido",
    "auth.login_success": "Inicio de sesión exitoso",
    "auth.register_success": "Cuenta creada exitosamente",
    "auth.invalid_credentials": "Correo electrónico o contraseña inválidos",

    // Documents
    "document.upload": "Cargar Documento",
    "document.license": "Licencia de Contratista",
    "document.liability": "Seguro de Responsabilidad General",
    "document.workers_comp": "Seguro de Compensación de Trabajadores",
    "document.surety_bond": "Fianza",
    "document.verified": "Verificado",
    "document.pending": "Pendiente",
    "document.expired": "Vencido",
    "document.expiration_date": "Fecha de Vencimiento",
    "document.upload_new": "Cargar Nuevo Documento",

    // Materials Marketplace
    "materials.title": "Mercado de Materiales",
    "materials.discount": "Descuento para Contratistas",
    "materials.price": "Precio",
    "materials.quantity": "Cantidad",
    "materials.add_to_estimate": "Agregar a Presupuesto",
    "materials.search": "Buscar Materiales",
    "materials.category": "Categoría",
    "materials.glazing": "Cristalería",
    "materials.hardware": "Herrajes",
    "materials.sealants": "Selladores",
    "materials.tools": "Herramientas",

    // Proposals
    "proposal.create": "Crear Propuesta",
    "proposal.title": "Propuesta",
    "proposal.status": "Estado",
    "proposal.amount": "Cantidad",
    "proposal.date": "Fecha",
    "proposal.share": "Compartir Propuesta",
    "proposal.send_link": "Enviar Enlace al Cliente",
    "proposal.client_portal": "Portal del Cliente",

    // Client Portal
    "client.view_proposal": "Ver Propuesta",
    "client.accept": "Aceptar",
    "client.decline": "Rechazar",
    "client.message": "Mensaje al Contratista",
    "client.schedule": "Programar",
    "client.contact": "Información de Contacto",

    // Performance Metrics
    "performance.acceptance_rate": "Tasa de Aceptación",
    "performance.success_rate": "Tasa de Éxito",
    "performance.quality_score": "Puntuación de Calidad",
    "performance.revenue": "Ingresos Generados",
    "performance.projects_completed": "Proyectos Completados",
    "performance.client_satisfaction": "Satisfacción del Cliente",

    // Compliance
    "compliance.status": "Estado de Cumplimiento",
    "compliance.verified": "Verificado",
    "compliance.pending_review": "Revisión Pendiente",
    "compliance.renewal_due": "Renovación Vencida",
    "compliance.audit_trail": "Registro de Auditoría",

    // General
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.back": "Atrás",
    "common.next": "Siguiente",
    "common.previous": "Anterior",
    "common.submit": "Enviar",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Éxito",
    "common.warning": "Advertencia",
    "common.info": "Información",
  },

  pt: {
    // Navigation
    "nav.dashboard": "Painel de Controle",
    "nav.contractors": "Contratantes",
    "nav.estimates": "Orçamentos",
    "nav.proposals": "Propostas",
    "nav.media": "Mídia",
    "nav.documents": "Documentos",
    "nav.materials": "Materiais",
    "nav.settings": "Configurações",
    "nav.logout": "Sair",

    // Contractor Dashboard
    "contractor.dashboard.title": "Painel do Contratante",
    "contractor.dashboard.subtitle": "Gerencie seu perfil, projetos e desempenho",
    "contractor.profile": "Perfil",
    "contractor.projects": "Projetos",
    "contractor.performance": "Desempenho",
    "contractor.documents": "Documentos",
    "contractor.settings": "Configurações",

    // Authentication
    "auth.login": "Entrar",
    "auth.register": "Registrar",
    "auth.email": "Email",
    "auth.password": "Senha",
    "auth.confirm_password": "Confirmar Senha",
    "auth.phone": "Número de Telefone",
    "auth.company_name": "Nome da Empresa",
    "auth.trade": "Ofício/Especialidade",
    "auth.language": "Idioma Preferido",
    "auth.login_success": "Login realizado com sucesso",
    "auth.register_success": "Conta criada com sucesso",
    "auth.invalid_credentials": "Email ou senha inválidos",

    // Documents
    "document.upload": "Carregar Documento",
    "document.license": "Licença de Contratante",
    "document.liability": "Seguro de Responsabilidade Geral",
    "document.workers_comp": "Seguro de Compensação do Trabalhador",
    "document.surety_bond": "Caução",
    "document.verified": "Verificado",
    "document.pending": "Pendente",
    "document.expired": "Expirado",
    "document.expiration_date": "Data de Expiração",
    "document.upload_new": "Carregar Novo Documento",

    // Materials Marketplace
    "materials.title": "Mercado de Materiais",
    "materials.discount": "Desconto para Contratantes",
    "materials.price": "Preço",
    "materials.quantity": "Quantidade",
    "materials.add_to_estimate": "Adicionar ao Orçamento",
    "materials.search": "Pesquisar Materiais",
    "materials.category": "Categoria",
    "materials.glazing": "Vidraçaria",
    "materials.hardware": "Ferragens",
    "materials.sealants": "Selantes",
    "materials.tools": "Ferramentas",

    // Proposals
    "proposal.create": "Criar Proposta",
    "proposal.title": "Proposta",
    "proposal.status": "Status",
    "proposal.amount": "Valor",
    "proposal.date": "Data",
    "proposal.share": "Compartilhar Proposta",
    "proposal.send_link": "Enviar Link para Cliente",
    "proposal.client_portal": "Portal do Cliente",

    // Client Portal
    "client.view_proposal": "Ver Proposta",
    "client.accept": "Aceitar",
    "client.decline": "Recusar",
    "client.message": "Mensagem para Contratante",
    "client.schedule": "Agendar",
    "client.contact": "Informações de Contato",

    // Performance Metrics
    "performance.acceptance_rate": "Taxa de Aceitação",
    "performance.success_rate": "Taxa de Sucesso",
    "performance.quality_score": "Pontuação de Qualidade",
    "performance.revenue": "Receita Gerada",
    "performance.projects_completed": "Projetos Concluídos",
    "performance.client_satisfaction": "Satisfação do Cliente",

    // Compliance
    "compliance.status": "Status de Conformidade",
    "compliance.verified": "Verificado",
    "compliance.pending_review": "Revisão Pendente",
    "compliance.renewal_due": "Renovação Vencida",
    "compliance.audit_trail": "Trilha de Auditoria",

    // General
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.delete": "Deletar",
    "common.edit": "Editar",
    "common.back": "Voltar",
    "common.next": "Próximo",
    "common.previous": "Anterior",
    "common.submit": "Enviar",
    "common.loading": "Carregando...",
    "common.error": "Erro",
    "common.success": "Sucesso",
    "common.warning": "Aviso",
    "common.info": "Informação",
  },

  fr: {
    // Navigation
    "nav.dashboard": "Tableau de Bord",
    "nav.contractors": "Entrepreneurs",
    "nav.estimates": "Devis",
    "nav.proposals": "Propositions",
    "nav.media": "Médias",
    "nav.documents": "Documents",
    "nav.materials": "Matériaux",
    "nav.settings": "Paramètres",
    "nav.logout": "Déconnexion",

    // Contractor Dashboard
    "contractor.dashboard.title": "Tableau de Bord de l'Entrepreneur",
    "contractor.dashboard.subtitle": "Gérez votre profil, vos projets et vos performances",
    "contractor.profile": "Profil",
    "contractor.projects": "Projets",
    "contractor.performance": "Performance",
    "contractor.documents": "Documents",
    "contractor.settings": "Paramètres",

    // Authentication
    "auth.login": "Connexion",
    "auth.register": "S'inscrire",
    "auth.email": "Email",
    "auth.password": "Mot de passe",
    "auth.confirm_password": "Confirmer le mot de passe",
    "auth.phone": "Numéro de Téléphone",
    "auth.company_name": "Nom de l'Entreprise",
    "auth.trade": "Métier/Spécialité",
    "auth.language": "Langue Préférée",
    "auth.login_success": "Connexion réussie",
    "auth.register_success": "Compte créé avec succès",
    "auth.invalid_credentials": "Email ou mot de passe invalide",

    // Documents
    "document.upload": "Télécharger un Document",
    "document.license": "Licence d'Entrepreneur",
    "document.liability": "Assurance Responsabilité Civile",
    "document.workers_comp": "Assurance Accidents du Travail",
    "document.surety_bond": "Cautionnement",
    "document.verified": "Vérifié",
    "document.pending": "En Attente",
    "document.expired": "Expiré",
    "document.expiration_date": "Date d'Expiration",
    "document.upload_new": "Télécharger un Nouveau Document",

    // Materials Marketplace
    "materials.title": "Marché des Matériaux",
    "materials.discount": "Remise pour Entrepreneurs",
    "materials.price": "Prix",
    "materials.quantity": "Quantité",
    "materials.add_to_estimate": "Ajouter au Devis",
    "materials.search": "Rechercher des Matériaux",
    "materials.category": "Catégorie",
    "materials.glazing": "Vitrerie",
    "materials.hardware": "Quincaillerie",
    "materials.sealants": "Scellants",
    "materials.tools": "Outils",

    // Proposals
    "proposal.create": "Créer une Proposition",
    "proposal.title": "Proposition",
    "proposal.status": "Statut",
    "proposal.amount": "Montant",
    "proposal.date": "Date",
    "proposal.share": "Partager la Proposition",
    "proposal.send_link": "Envoyer le Lien au Client",
    "proposal.client_portal": "Portail Client",

    // Client Portal
    "client.view_proposal": "Voir la Proposition",
    "client.accept": "Accepter",
    "client.decline": "Refuser",
    "client.message": "Message à l'Entrepreneur",
    "client.schedule": "Planifier",
    "client.contact": "Informations de Contact",

    // Performance Metrics
    "performance.acceptance_rate": "Taux d'Acceptation",
    "performance.success_rate": "Taux de Réussite",
    "performance.quality_score": "Score de Qualité",
    "performance.revenue": "Revenu Généré",
    "performance.projects_completed": "Projets Complétés",
    "performance.client_satisfaction": "Satisfaction du Client",

    // Compliance
    "compliance.status": "Statut de Conformité",
    "compliance.verified": "Vérifié",
    "compliance.pending_review": "Révision en Attente",
    "compliance.renewal_due": "Renouvellement Dû",
    "compliance.audit_trail": "Piste d'Audit",

    // General
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.back": "Retour",
    "common.next": "Suivant",
    "common.previous": "Précédent",
    "common.submit": "Soumettre",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
    "common.warning": "Avertissement",
    "common.info": "Information",
  },

  de: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.contractors": "Auftragnehmer",
    "nav.estimates": "Angebote",
    "nav.proposals": "Vorschläge",
    "nav.media": "Medien",
    "nav.documents": "Dokumente",
    "nav.materials": "Materialien",
    "nav.settings": "Einstellungen",
    "nav.logout": "Abmelden",

    // Contractor Dashboard
    "contractor.dashboard.title": "Auftragnehmer-Dashboard",
    "contractor.dashboard.subtitle": "Verwalten Sie Ihr Profil, Ihre Projekte und Ihre Leistung",
    "contractor.profile": "Profil",
    "contractor.projects": "Projekte",
    "contractor.performance": "Leistung",
    "contractor.documents": "Dokumente",
    "contractor.settings": "Einstellungen",

    // Authentication
    "auth.login": "Anmelden",
    "auth.register": "Registrieren",
    "auth.email": "E-Mail",
    "auth.password": "Passwort",
    "auth.confirm_password": "Passwort Bestätigen",
    "auth.phone": "Telefonnummer",
    "auth.company_name": "Firmenname",
    "auth.trade": "Handwerk/Spezialität",
    "auth.language": "Bevorzugte Sprache",
    "auth.login_success": "Anmeldung erfolgreich",
    "auth.register_success": "Konto erfolgreich erstellt",
    "auth.invalid_credentials": "Ungültige E-Mail oder Passwort",

    // Documents
    "document.upload": "Dokument Hochladen",
    "document.license": "Auftragnehmer-Lizenz",
    "document.liability": "Haftpflichtversicherung",
    "document.workers_comp": "Arbeitsunfallversicherung",
    "document.surety_bond": "Kaution",
    "document.verified": "Verifiziert",
    "document.pending": "Ausstehend",
    "document.expired": "Abgelaufen",
    "document.expiration_date": "Ablaufdatum",
    "document.upload_new": "Neues Dokument Hochladen",

    // Materials Marketplace
    "materials.title": "Materialmarktplatz",
    "materials.discount": "Auftragnehmer-Rabatt",
    "materials.price": "Preis",
    "materials.quantity": "Menge",
    "materials.add_to_estimate": "Zum Angebot Hinzufügen",
    "materials.search": "Materialien Suchen",
    "materials.category": "Kategorie",
    "materials.glazing": "Verglasung",
    "materials.hardware": "Beschläge",
    "materials.sealants": "Dichtungsmittel",
    "materials.tools": "Werkzeuge",

    // Proposals
    "proposal.create": "Vorschlag Erstellen",
    "proposal.title": "Vorschlag",
    "proposal.status": "Status",
    "proposal.amount": "Betrag",
    "proposal.date": "Datum",
    "proposal.share": "Vorschlag Teilen",
    "proposal.send_link": "Link an Kunde Senden",
    "proposal.client_portal": "Kundenportal",

    // Client Portal
    "client.view_proposal": "Vorschlag Anzeigen",
    "client.accept": "Akzeptieren",
    "client.decline": "Ablehnen",
    "client.message": "Nachricht an Auftragnehmer",
    "client.schedule": "Zeitplan",
    "client.contact": "Kontaktinformationen",

    // Performance Metrics
    "performance.acceptance_rate": "Akzeptanzrate",
    "performance.success_rate": "Erfolgsquote",
    "performance.quality_score": "Qualitätsbewertung",
    "performance.revenue": "Generierte Einnahmen",
    "performance.projects_completed": "Abgeschlossene Projekte",
    "performance.client_satisfaction": "Kundenzufriedenheit",

    // Compliance
    "compliance.status": "Compliance-Status",
    "compliance.verified": "Verifiziert",
    "compliance.pending_review": "Überprüfung Ausstehend",
    "compliance.renewal_due": "Erneuerung Fällig",
    "compliance.audit_trail": "Audit-Protokoll",

    // General
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.back": "Zurück",
    "common.next": "Weiter",
    "common.previous": "Zurück",
    "common.submit": "Absenden",
    "common.loading": "Wird geladen...",
    "common.error": "Fehler",
    "common.success": "Erfolg",
    "common.warning": "Warnung",
    "common.info": "Information",
  },
};

/**
 * Get translation for a key in a specific language
 */
export const t = (key: string, language: Language = "en"): string => {
  const lang_dict = translations[language];
  return lang_dict[key] || key;
};

/**
 * Get all translations for a language
 */
export const getLanguageTranslations = (language: Language): Record<string, string> => {
  return translations[language] || translations.en;
};

/**
 * Translate with variable substitution
 */
export const tWithVars = (
  key: string,
  vars: Record<string, string | number>,
  language: Language = "en"
): string => {
  let text = t(key, language);
  Object.keys(vars).forEach((var_key) => {
    text = text.replace(`{{${var_key}}}`, String(vars[var_key]));
  });
  return text;
};
