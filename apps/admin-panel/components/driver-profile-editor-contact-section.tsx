"use client";

import { useState } from "react";
import { DriverEmergencyContact } from "../lib/api";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type EmergencyContactState = DriverEmergencyContact;

type DriverProfileEditorContactSectionProps = {
  activeSection: DriverEditorSection;
  phone: string;
  email: string;
  emergencyContacts: EmergencyContactState[];
  minimumEmergencyContacts?: number;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onEmergencyContactsChange: (contacts: EmergencyContactState[]) => void;
};

const emptyEmergencyContact: EmergencyContactState = {
  name: "",
  relation: "",
  phone: "",
  isWhatsapp: false,
  notes: ""
};

const emergencyRelationOptions = [
  { value: "MAE", label: "Mae" },
  { value: "PAI", label: "Pai" },
  { value: "ESPOSA", label: "Esposa" },
  { value: "ESPOSO", label: "Esposo" },
  { value: "FILHO", label: "Filho" },
  { value: "FILHA", label: "Filha" },
  { value: "IRMAO", label: "Irmao" },
  { value: "IRMA", label: "Irma" },
  { value: "TIO", label: "Tio" },
  { value: "TIA", label: "Tia" },
  { value: "AMIGO", label: "Amigo" },
  { value: "OUTRO", label: "Outro" }
] as const;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatPhoneInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function resolveEmergencyRelationLabel(value: string): string {
  return emergencyRelationOptions.find((option) => option.value === value)?.label ?? "Contato de emergencia";
}

export function DriverProfileEditorContactSection({
  activeSection,
  phone,
  email,
  emergencyContacts,
  minimumEmergencyContacts = 2,
  onPhoneChange,
  onEmailChange,
  onEmergencyContactsChange
}: DriverProfileEditorContactSectionProps) {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [draftEmergencyContact, setDraftEmergencyContact] = useState<EmergencyContactState>(emptyEmergencyContact);
  const [editingEmergencyContactIndex, setEditingEmergencyContactIndex] = useState<number | null>(null);
  const emergencyPhoneDigits = digitsOnly(draftEmergencyContact.phone);
  const hasEmergencyContact = draftEmergencyContact.name.trim().length > 0 && emergencyPhoneDigits.length >= 10;
  const missingEmergencyContacts = Math.max(0, minimumEmergencyContacts - emergencyContacts.length);
  const hasMinimumEmergencyContacts = missingEmergencyContacts === 0;

  function openEmergencyModal(index?: number) {
    if (typeof index === "number") {
      setEditingEmergencyContactIndex(index);
      setDraftEmergencyContact(emergencyContacts[index] ?? emptyEmergencyContact);
    } else {
      setEditingEmergencyContactIndex(null);
      setDraftEmergencyContact(emptyEmergencyContact);
    }
    setIsEmergencyModalOpen(true);
  }

  function closeEmergencyModal() {
    setIsEmergencyModalOpen(false);
    setEditingEmergencyContactIndex(null);
    setDraftEmergencyContact(emptyEmergencyContact);
  }

  function saveEmergencyContact() {
    if (!hasEmergencyContact) {
      return;
    }

    const normalizedContact: EmergencyContactState = {
      name: draftEmergencyContact.name.trim(),
      relation: draftEmergencyContact.relation.trim(),
      phone: formatPhoneInput(draftEmergencyContact.phone),
      isWhatsapp: Boolean(draftEmergencyContact.isWhatsapp),
      notes: draftEmergencyContact.notes?.trim() || ""
    };

    const nextContacts =
      editingEmergencyContactIndex === null
        ? [...emergencyContacts, normalizedContact]
        : emergencyContacts.map((contact, index) => (index === editingEmergencyContactIndex ? normalizedContact : contact));
    onEmergencyContactsChange(nextContacts);

    setIsEmergencyModalOpen(false);
    setEditingEmergencyContactIndex(null);
    setDraftEmergencyContact(emptyEmergencyContact);
  }

  function removeEmergencyContact(indexToRemove: number) {
    onEmergencyContactsChange(emergencyContacts.filter((_, index) => index !== indexToRemove));
  }

  return (
    <article
      id="driver-editor-contact"
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "contact" ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">03</span>
        <div className="panel-head">
          <h2>Contato e emergencia</h2>
          <span>Dados principais de contato e o ponto de apoio em caso de sinistro.</span>
        </div>
      </div>

      <div className="driver-editor-block">
        <div className="driver-editor-block-head">
          <strong>Contato principal</strong>
          <p className="helper-text">Canal principal para comunicacao com o motorista.</p>
        </div>
        <div className="form-grid">
          <label className="driver-phone-field">
            Celular (WhatsApp)
            <div className="driver-phone-control">
              <span className="driver-phone-prefix">+55</span>
              <input value={phone} onChange={(event) => onPhoneChange(event.target.value)} placeholder="(00) 00000-0000" inputMode="numeric" />
            </div>
          </label>
          <label>
            E-mail
            <input value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="motorista@empresa.com" />
          </label>
        </div>
      </div>

      <div className="driver-editor-block">
        <div className="driver-editor-block-head panel-head-inline">
          <div>
            <strong>Contato de emergencia</strong>
            <p className="helper-text">
              Cadastro reservado para apoio rapido em situacoes de sinistro ou urgencia. Minimo de {minimumEmergencyContacts} contatos obrigatorios.
            </p>
          </div>
          <button type="button" className="secondary" onClick={() => openEmergencyModal()}>
            Adicionar contato
          </button>
        </div>
        <div className="driver-editor-summary-strip">
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact, index) => (
              <article key={`${contact.name}-${contact.phone}-${index}`} className="driver-editor-summary-card">
                <span>{resolveEmergencyRelationLabel(contact.relation)}</span>
                <strong>{contact.name}</strong>
                <small>{`${formatPhoneInput(contact.phone)}${contact.isWhatsapp ? " · WhatsApp" : ""}`}</small>
                {contact.notes ? <small>{contact.notes}</small> : null}
                <div className="driver-editor-summary-card-actions">
                  <button type="button" className="driver-editor-summary-link" onClick={() => openEmergencyModal(index)}>
                    Editar
                  </button>
                  <button type="button" className="driver-editor-summary-link is-danger" onClick={() => removeEmergencyContact(index)}>
                    Remover
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="driver-editor-summary-card">
              <span>Responsavel</span>
              <strong>Pendente</strong>
              <small>{`Cadastre no minimo ${minimumEmergencyContacts} contatos com nome, parentesco e telefone.`}</small>
            </article>
          )}
        </div>
        {!hasMinimumEmergencyContacts ? (
          <p className="helper-text">{`Faltam ${missingEmergencyContacts} contato(s) de emergencia para liberar o salvamento.`}</p>
        ) : null}
      </div>

      <DriverProfileEditorModal
        open={isEmergencyModalOpen}
        title={editingEmergencyContactIndex === null ? "Adicionar contato de emergencia" : "Editar contato de emergencia"}
        description={`Preencha o ponto de apoio que deve ser acionado em situacoes de urgencia ou sinistro. Minimo de ${minimumEmergencyContacts} contatos.`}
        onClose={closeEmergencyModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeEmergencyModal}>
              Cancelar
            </button>
            <button type="button" onClick={saveEmergencyContact} disabled={!hasEmergencyContact}>
              {editingEmergencyContactIndex === null ? "Adicionar contato" : "Salvar contato"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label>
            Nome do contato
            <input
              value={draftEmergencyContact.name}
              onChange={(event) => setDraftEmergencyContact((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nome completo"
            />
          </label>
          <label>
            Parentesco
            <select
              className="select"
              value={draftEmergencyContact.relation}
              onChange={(event) => setDraftEmergencyContact((current) => ({ ...current, relation: event.target.value }))}
            >
              <option value="">Selecionar parentesco</option>
              {emergencyRelationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Telefone
            <input
              value={draftEmergencyContact.phone}
              onChange={(event) =>
                setDraftEmergencyContact((current) => ({ ...current, phone: formatPhoneInput(event.target.value) }))
              }
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </label>
          <label className="driver-editor-modal-checkbox">
            <input
              type="checkbox"
              checked={draftEmergencyContact.isWhatsapp}
              onChange={(event) =>
                setDraftEmergencyContact((current) => ({ ...current, isWhatsapp: event.target.checked }))
              }
            />
            <span>Esse numero tambem e WhatsApp</span>
          </label>
          <label className="driver-editor-modal-field-full">
            Observacoes
            <textarea
              rows={4}
              value={draftEmergencyContact.notes}
              onChange={(event) => setDraftEmergencyContact((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Informacoes uteis para atendimento em emergencia."
            />
          </label>
        </div>
      </DriverProfileEditorModal>
    </article>
  );
}
