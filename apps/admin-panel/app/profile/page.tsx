"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminProfile, request } from "../../lib/api";
import {
  clearAdminSession,
  getStoredAdminSession,
  storeAdminSession,
  type AdminGender,
  type AdminSession
} from "../../lib/admin-auth";

type ProfileFormState = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: AdminGender | "";
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
};

type EmailFormState = {
  password: string;
  newEmail: string;
};

const initialFormState: ProfileFormState = {
  name: "",
  cpf: "",
  phone: "",
  email: "",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  gender: ""
};

const initialPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: ""
};

const initialEmailForm: EmailFormState = {
  password: "",
  newEmail: ""
};

const genderOptions: Array<{ value: AdminGender; label: string }> = [
  { value: "FEMALE", label: "Feminino" },
  { value: "MALE", label: "Masculino" },
  { value: "NON_BINARY", label: "Nao-binario" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefiro nao dizer" }
];

const monthOptions: Array<{ value: string; label: string }> = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Marco" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" }
];

export default function ProfilePage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialFormState);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordForm);
  const [emailForm, setEmailForm] = useState<EmailFormState>(initialEmailForm);
  const [activeCredentialPanel, setActiveCredentialPanel] = useState<"password" | "email" | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando perfil do operador.");

  useEffect(() => {
    const storedSession = getStoredAdminSession();
    if (storedSession) {
      setSession(storedSession);
    }

    void request<AdminProfile>("/auth/admin/profile")
      .then((profile) => {
        const nextSession: AdminSession = {
          expiresAt: storedSession?.expiresAt,
          user: profile
        };

        storeAdminSession(nextSession);
        setSession(nextSession);
        setForm(toProfileFormState(profile));
        setEmailForm((current) => ({ ...current, newEmail: profile.email }));
        setStatusMessage("Perfil carregado do banco de dados.");
      })
      .catch((error: Error) => {
        clearAdminSession();
        setSession(null);
        setStatusMessage(error.message);
      });
  }, []);

  const initials = useMemo(() => {
    const source = form.name || session?.user.name || "O";
    return source.trim().charAt(0).toUpperCase();
  }, [form.name, session?.user.name]);

  function syncSessionUser(profile: AdminProfile) {
    if (!session) {
      return;
    }

    const nextSession: AdminSession = {
      ...session,
      user: profile
    };

    storeAdminSession(nextSession);
    setSession(nextSession);
  }

  function handleSaveProfile(): void {
    const normalizedName = form.name.trim();
    if (!normalizedName) {
      setStatusMessage("Preencha o nome do operador.");
      return;
    }

    void request<AdminProfile>("/auth/admin/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: normalizedName,
        cpf: form.cpf || undefined,
        phone: form.phone || undefined,
        birthDate: toBirthDateValue(form.birthDay, form.birthMonth, form.birthYear),
        gender: form.gender || undefined
      })
    })
      .then((profile) => {
        syncSessionUser(profile);
        setForm(toProfileFormState(profile));
        setStatusMessage("Perfil salvo no banco de dados.");
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }

  function handleChangePassword(): void {
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) {
      setStatusMessage("Informe a senha atual e a nova senha.");
      return;
    }

    void request<{ success: true }>("/auth/admin/change-password", {
      method: "POST",
      body: JSON.stringify(passwordForm)
    })
      .then(() => {
        setPasswordForm(initialPasswordForm);
        setActiveCredentialPanel(null);
        setStatusMessage("Senha atualizada com sucesso.");
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }

  function handleChangeEmail(): void {
    if (!emailForm.password.trim() || !emailForm.newEmail.trim()) {
      setStatusMessage("Informe a senha e o novo e-mail.");
      return;
    }

    void request<AdminProfile>("/auth/admin/change-email", {
      method: "POST",
      body: JSON.stringify(emailForm)
    })
      .then((profile) => {
        syncSessionUser(profile);
        setForm(toProfileFormState(profile));
        setEmailForm({ password: "", newEmail: profile.email });
        setActiveCredentialPanel(null);
        setStatusMessage("Credencial de e-mail atualizada com sucesso.");
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }

  return (
    <main className="page-shell admin-profile-page">
      <section className="admin-profile-hero panel">
        <div className="admin-profile-hero-avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="admin-profile-hero-copy">
          <p className="eyebrow">Perfil do operador</p>
          <h1>{form.name || session?.user.name || "Operador local"}</h1>
          <span>{session?.user.role === "ADMIN" ? "Administrador" : "Operacao"}</span>
          <p className="helper-text">{statusMessage}</p>
        </div>
      </section>

      <section className="admin-profile-layout">
        <article className="panel admin-profile-main">
          <div className="panel-head">
            <h2>Dados pessoais</h2>
            <span>Informacoes persistidas no cadastro da conta administrativa.</span>
          </div>

          <div className="stack">
            <div className="form-grid">
              <label>
                Nome
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nome do operador"
                />
              </label>

              <label>
                CPF
                <input
                  value={form.cpf}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))
                  }
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Telefone
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: formatPhoneInput(event.target.value) }))
                  }
                  placeholder="(27) 99999-0000"
                  inputMode="tel"
                />
              </label>

              <label>
                E-mail
                <input type="email" value={form.email} disabled placeholder="operacao@inturb.local" />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Data de nascimento
                <div className="driver-birth-grid">
                  <input
                    value={form.birthDay}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birthDay: event.target.value.replace(/\D/g, "").slice(0, 2)
                      }))
                    }
                    placeholder="Dia"
                    inputMode="numeric"
                  />
                  <select
                    className="select"
                    value={form.birthMonth}
                    onChange={(event) => setForm((current) => ({ ...current, birthMonth: event.target.value }))}
                  >
                    <option value="">Mes</option>
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={form.birthYear}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birthYear: event.target.value.replace(/\D/g, "").slice(0, 4)
                      }))
                    }
                    placeholder="Ano"
                    inputMode="numeric"
                  />
                </div>
              </label>

              <label>
                Genero
                <select
                  className="select"
                  value={form.gender}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gender: event.target.value as ProfileFormState["gender"]
                    }))
                  }
                >
                  <option value="">Selecionar opcao</option>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="action-row admin-profile-actions">
              <span className="helper-text">O e-mail exibido aqui e a credencial atual da conta e muda na area de credenciais.</span>
              <button type="button" onClick={handleSaveProfile}>
                Salvar perfil
              </button>
            </div>
          </div>
        </article>

        <aside className="panel admin-profile-sidebar">
          <div className="panel-head">
            <h2>Resumo</h2>
            <span>Identificacao atual da conta administrativa.</span>
          </div>

          <div className="admin-profile-summary">
            <div className="admin-profile-summary-item">
              <span>Nome exibido</span>
              <strong>{form.name || "-"}</strong>
            </div>
            <div className="admin-profile-summary-item">
              <span>CPF</span>
              <strong>{form.cpf || "-"}</strong>
            </div>
            <div className="admin-profile-summary-item">
              <span>Telefone</span>
              <strong>{form.phone || "-"}</strong>
            </div>
            <div className="admin-profile-summary-item">
              <span>Credencial atual</span>
              <strong>{form.email || "-"}</strong>
            </div>
          </div>

          <div className="admin-profile-credential-list">
            <button
              type="button"
              className="admin-profile-credential-card"
              onClick={() => setActiveCredentialPanel((current) => (current === "password" ? null : "password"))}
            >
              <div className="admin-profile-credential-copy">
                <span>Alterar senha</span>
                <strong>Atualize a senha usada no login administrativo.</strong>
              </div>
              <span className="admin-profile-credential-action">
                {activeCredentialPanel === "password" ? "Fechar" : "Abrir"}
              </span>
            </button>

            {activeCredentialPanel === "password" ? (
              <div className="admin-profile-credential-form">
                <label>
                  Senha atual
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                    placeholder="Digite a senha atual"
                  />
                </label>

                <label>
                  Nova senha
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                    placeholder="Minimo de 6 caracteres"
                  />
                </label>

                <button type="button" onClick={handleChangePassword}>
                  Salvar nova senha
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="admin-profile-credential-card"
              onClick={() => setActiveCredentialPanel((current) => (current === "email" ? null : "email"))}
            >
              <div className="admin-profile-credential-copy">
                <span>Alterar e-mail da conta</span>
                <strong>Troque a credencial usada no acesso administrativo.</strong>
              </div>
              <span className="admin-profile-credential-action">
                {activeCredentialPanel === "email" ? "Fechar" : "Abrir"}
              </span>
            </button>

            {activeCredentialPanel === "email" ? (
              <div className="admin-profile-credential-form">
                <label>
                  Novo e-mail
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(event) => setEmailForm((current) => ({ ...current, newEmail: event.target.value }))}
                    placeholder="novo-email@empresa.com"
                  />
                </label>

                <label>
                  Senha atual
                  <input
                    type="password"
                    value={emailForm.password}
                    onChange={(event) => setEmailForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Confirme com a senha atual"
                  />
                </label>

                <button type="button" onClick={handleChangeEmail}>
                  Salvar novo e-mail
                </button>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function toProfileFormState(profile: AdminProfile): ProfileFormState {
  const birthDate = parseBirthDateParts(profile.birthDate);

  return {
    name: profile.name,
    cpf: formatCpfInput(profile.cpf ?? ""),
    phone: formatPhoneInput(profile.phone ?? ""),
    email: profile.email,
    birthDay: birthDate.day,
    birthMonth: birthDate.month,
    birthYear: birthDate.year,
    gender: profile.gender ?? ""
  };
}

function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function parseBirthDateParts(value?: string): { day: string; month: string; year: string } {
  if (!value) {
    return { day: "", month: "", year: "" };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return { day: "", month: "", year: "" };
  }

  return {
    year: match[1],
    month: match[2],
    day: String(Number(match[3]))
  };
}

function toBirthDateValue(day: string, month: string, year: string): string | undefined {
  if (!day || !month || !year || year.length !== 4) {
    return undefined;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}
