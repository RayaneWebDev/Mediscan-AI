/**
 * CUI categories grouped by semantic type.
 * Derived from artifacts/cui_categories.json
 */

export const CUI_TYPES = {
  modalite: [
    { cui: "C0040405", label_fr: "Scanner CT", label_en: "Computed Tomography" },
    { cui: "C1306645", label_fr: "Radiographie", label_en: "Plain Radiograph" },
    { cui: "C0024485", label_fr: "IRM", label_en: "MRI" },
    { cui: "C0041618", label_fr: "Echographie", label_en: "Ultrasonography" },
    { cui: "C0002978", label_fr: "Angiographie", label_en: "Angiography" },
    { cui: "C0032743", label_fr: "Scintigraphie / PET scan", label_en: "Nuclear Medicine / PET" },
  ],
  anatomie: [
    { cui: "C0817096", label_fr: "Thorax / Poumon", label_en: "Lung / Chest" },
    { cui: "C0037303", label_fr: "Crâne / Mâchoire", label_en: "Head / Jaw / Spine" },
    { cui: "C0023216", label_fr: "Hanche / Membre inférieur", label_en: "Hip / Lower Limb" },
    { cui: "C0000726", label_fr: "Abdomen", label_en: "Abdomen" },
    { cui: "C0030797", label_fr: "Pelvis / Voies urinaires", label_en: "Pelvis / Urinary tract" },
    { cui: "C0037005", label_fr: "Epaule", label_en: "Shoulder" },
  ],
  finding: [
    { cui: "C1999039", label_fr: "Dispositif médical / Implant", label_en: "Medical device / Implant" },
    { cui: "C1996865", label_fr: "Anomalie pulmonaire", label_en: "Lung finding / Chest opacity" },
    { cui: "C0037949", label_fr: "Pathologie spinale", label_en: "Spinal surgery / Pathology" },
    { cui: "C0006141", label_fr: "Lésion mammaire", label_en: "Breast lesion / Mammogram" },
  ],
};
