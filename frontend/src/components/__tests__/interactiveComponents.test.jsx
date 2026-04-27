/**
 * @fileoverview Interactive component behavior tests for user-facing controls.
 *
 * This suite validates mid-level interactions: guarded mode changes, upload
 * paths, result cards, modal controls, filter callbacks, language/navigation
 * controls, contact submission, and clinical conclusion states.
 * @module components/tests/interactiveComponentsTest
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ClinicalConclusion from "../ClinicalConclusion";
import ContactPage from "../ContactPage";
import Controls from "../Controls";
import LanguageSelector from "../LanguageSelector";
import Navigation from "../Navigation";
import {
  ResultCompareModalView,
  ResultDetailsModalView,
  PaginationControls,
  ResultsGridCards,
  ResultsGridHeader,
  ResultsGridToolbar,
} from "../ResultsGridParts";
import {
  SearchCaptionFilterCard,
  SearchCuiFilterCard,
  SearchFilterPanelHeader,
  SearchReferenceFilterCard,
  SearchScoreFilterCard,
  SearchSortFilterCard,
} from "../SearchFilterSections";
import { SearchGuideCard, SearchGuideSectionHeader } from "../SearchGuideSections";
import UploadZone from "../UploadZone";
import { fetchConclusion, sendContactMessage } from "../../api";
import { fr } from "../../i18n/fr";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchConclusion: vi.fn(),
    sendContactMessage: vi.fn(),
  };
});

const resultRows = [
  {
    rank: 1,
    image_id: "img-1",
    caption: "Chest x-ray with opacity",
    cui: ["C1", "C2"],
    path: "/img-1.png",
    score: 0.9,
  },
  {
    rank: 2,
    image_id: "img-2",
    caption: "Brain MRI",
    cui: "C3",
    path: "",
    score: 0.4,
  },
];

const resultsContent = fr.search.results;

describe("interactive components", () => {
  it("handles controls interactions and guarded mode changes", () => {
    const onModeChange = vi.fn(() => "confirm");
    const onKChange = vi.fn();
    const onSearch = vi.fn();
    const onModeInfoClick = vi.fn();

    renderWithProviders(
      <Controls
        mode="visual"
        onModeChange={onModeChange}
        k={5}
        onKChange={onKChange}
        onSearch={onSearch}
        disabled={false}
        modeChangeGuardActive
        modeChangeConfirmMessage="Changer de mode ?"
        modeChangeCancelLabel="Annuler"
        modeChangeConfirmActionLabel="Confirmer"
        onModeInfoClick={onModeInfoClick}
        modeInfoLabel="Infos mode"
      />,
    );

    fireEvent.click(screen.getByLabelText("Infos mode"));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "12" } });
    fireEvent.click(screen.getByText(fr.search.search));
    fireEvent.click(screen.getByText(fr.search.modeVisual));
    fireEvent.click(screen.getByText(fr.search.modeSemantic));

    expect(onModeInfoClick).toHaveBeenCalled();
    expect(onKChange).toHaveBeenCalledWith(12);
    expect(onSearch).toHaveBeenCalled();
    expect(onModeChange).toHaveBeenCalledWith("semantic", { force: false });
    expect(screen.getByText("Changer de mode ?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Confirmer"));
    expect(onModeChange).toHaveBeenCalledWith("semantic", { force: true });

    fireEvent.click(screen.getByText(fr.search.modeSemantic));
    fireEvent.click(screen.getByText("Annuler"));
    expect(screen.queryByText("Changer de mode ?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(fr.search.modeSemantic));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Changer de mode ?")).not.toBeInTheDocument();
  });

  it("renders disabled and loading controls without mode toggle", () => {
    const onModeChange = vi.fn();

    renderWithProviders(
      <Controls
        mode="semantic"
        onModeChange={onModeChange}
        k={1}
        onKChange={vi.fn()}
        onSearch={vi.fn()}
        disabled
        loading
        showModeToggle={false}
        modeToggleDisabled
      />,
    );

    expect(screen.queryByText(fr.search.analysisMode)).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("handles upload zone selection, drop, paste and preview removal", () => {
    const onFileSelect = vi.fn();
    const onRemove = vi.fn();
    const file = new File(["x"], "scan.png", { type: "image/png" });
    const pasted = new File(["y"], "paste.png", { type: "image/png" });
    const { rerender, unmount } = renderWithProviders(
      <UploadZone file={null} onFileSelect={onFileSelect} onRemove={onRemove} />,
    );

    fireEvent.change(document.querySelector("input[type='file']"), { target: { files: [file] } });
    const pickerInput = document.querySelector("input[type='file']");
    pickerInput.showPicker = vi.fn();
    fireEvent.keyDown(screen.getByLabelText(fr.search.image.uploadPrompt), { key: "Enter" });
    expect(pickerInput.showPicker).toHaveBeenCalled();
    fireEvent.dragOver(screen.getByLabelText(fr.search.image.uploadPrompt));
    fireEvent.dragLeave(screen.getByLabelText(fr.search.image.uploadPrompt));
    fireEvent.drop(screen.getByLabelText(fr.search.image.uploadPrompt), {
      dataTransfer: { files: [file] },
    });
    fireEvent.paste(window, {
      clipboardData: {
        items: [{ type: "image/png", getAsFile: () => pasted }],
      },
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(onFileSelect).toHaveBeenCalledWith(pasted);

    rerender(
      <UploadZone file={file} onFileSelect={onFileSelect} onRemove={onRemove} isAccent fillHeight enableToneTransition />,
    );

    expect(screen.getByAltText(fr.search.image.previewAlt)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onRemove).toHaveBeenCalled();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("renders result grid parts and emits card actions", () => {
    const onToggleSelect = vi.fn();
    const onOpenDetails = vi.fn();
    const onOpenCompare = vi.fn();
    const onGridRef = vi.fn();
    const onPageChange = vi.fn();
    const onExportJson = vi.fn();

    renderWithProviders(
      <>
        <ResultsGridHeader
          resultCount={2}
          content={resultsContent}
          modeLabel="Visual"
          modeColor="mode"
        />
        <ResultsGridToolbar
          currentPage={2}
          totalPages={10}
          onPageChange={onPageChange}
          content={resultsContent}
          tone="primary"
          exportLabel="Export"
          exportDisabled={false}
          exportButtonClass="export"
          activeExport="pdf"
          onExportJson={onExportJson}
          onExportCsv={vi.fn()}
          onExportPdf={vi.fn()}
        />
        <ResultsGridCards
          results={resultRows}
          selectedIds={["img-1"]}
          onToggleSelect={onToggleSelect}
          onOpenDetails={onOpenDetails}
          onOpenCompare={onOpenCompare}
          content={resultsContent}
          tone="accent"
          animateOnMount
          comparisonSource={{ src: "/query.png", alt: "Query" }}
          desktopPlaceholderCount={1}
          onGridRef={onGridRef}
        />
        <PaginationControls
          currentPage={5}
          totalPages={12}
          onPageChange={onPageChange}
          content={resultsContent}
          tone="primary"
          useHomeVisualTone
          showPageSummary={false}
        />
      </>,
    );

    fireEvent.click(screen.getByText("JSON"));
    fireEvent.click(screen.getAllByLabelText(resultsContent.nextPage)[0]);
    fireEvent.click(screen.getAllByLabelText(resultsContent.previousPage).at(-1));
    fireEvent.click(screen.getByText("6"));
    fireEvent.click(screen.getAllByLabelText(resultsContent.openDetails)[0]);
    fireEvent.click(screen.getAllByLabelText(resultsContent.compareAction)[0]);
    fireEvent.click(document.querySelector(".search-result-preview button"));

    expect(onExportJson).toHaveBeenCalled();
    expect(onPageChange).toHaveBeenCalled();
    expect(onOpenDetails).toHaveBeenCalled();
    expect(onOpenCompare).toHaveBeenCalled();
    expect(onToggleSelect).toHaveBeenCalledWith("img-1");
  });

  it("handles primary result cards, keyboard opening and image fallbacks", () => {
    const onOpenDetails = vi.fn();
    const onToggleSelect = vi.fn();

    renderWithProviders(
      <ResultsGridCards
        results={[{ ...resultRows[0], image_id: "img-fallback", path: "/broken.png", score: -0.8 }]}
        selectedIds={[]}
        onToggleSelect={onToggleSelect}
        onOpenDetails={onOpenDetails}
        onOpenCompare={null}
        content={resultsContent}
        tone="primary"
        useHomeVisualTone
        onGridRef={vi.fn()}
      />,
    );

    const image = screen.getByAltText("img-fallback");
    fireEvent.error(image);
    fireEvent.error(image);
    expect(screen.getByText("Image indisponible")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText(resultsContent.openDetails), { key: "Tab" });
    fireEvent.keyDown(screen.getByLabelText(resultsContent.openDetails), { key: "Enter" });
    expect(onOpenDetails).toHaveBeenCalled();

    fireEvent.click(document.querySelector(".search-result-preview button"));
    expect(onToggleSelect).toHaveBeenCalledWith("img-fallback");
  });

  it("renders modal views and download/close controls", () => {
    const onRequestClose = vi.fn();
    const onDownloadImage = vi.fn((event) => event.stopPropagation());

    renderWithProviders(
      <>
        <ResultDetailsModalView
          modalRef={{ current: null }}
          backdropStyle={{ opacity: 1 }}
          panelStyle={{ opacity: 1 }}
          tone="primary"
          modeLabel="Visual"
          content={resultsContent}
          result={resultRows[0]}
          imageSrc="/img-1.png"
          cuiValue=""
          scorePercent=""
          downloadPending={false}
          onRequestClose={onRequestClose}
          onDownloadImage={onDownloadImage}
        />
        <ResultCompareModalView
          modalRef={{ current: null }}
          backdropStyle={{ opacity: 1 }}
          panelStyle={{ opacity: 1 }}
          tone="accent"
          content={resultsContent}
          result={resultRows[0]}
          comparisonSource={{ src: "/query.png", alt: "Query", meta: "query" }}
          imageSrc="/img-1.png"
          cuiValue="C1, C2"
          scorePercent="95%"
          onRequestClose={onRequestClose}
        />
      </>,
    );

    fireEvent.click(screen.getByLabelText(resultsContent.downloadImage));
    fireEvent.click(screen.getAllByLabelText(resultsContent.closeDetails)[0]);
    fireEvent.click(screen.getAllByRole("dialog")[1].querySelector(".search-compare-modal"));

    expect(onDownloadImage).toHaveBeenCalled();
    expect(onRequestClose).toHaveBeenCalled();
  });

  it("renders filter and guide sections with callbacks", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    renderWithProviders(
      <>
        <SearchFilterPanelHeader
          title="Filtres"
          infoLabel="Info"
          onInfoClick={onChange}
          hint="Hint"
          onReset={onReset}
          resetLabel="Reset"
        />
        <SearchCaptionFilterCard
          label="Caption"
          value=""
          onChange={onChange}
          placeholder="caption"
          suggestedFilters={[{ id: "x", label: "X-ray", count: 2 }]}
          activeFilterIds={[]}
          onToggleFilter={onChange}
          getToggleClassName={(active) => (active ? "active" : "inactive")}
          quickTermsLabel="Suggestions"
          quickTermsHint="hint"
        />
        <SearchCuiFilterCard
          label="CUI"
          value=""
          onChange={onChange}
          placeholder="cui"
          selectGroups={[
            {
              label: "Modalite",
              value: "",
              onChange,
              options: [{ cui: "C1", label_fr: "Radio", label_en: "Radiograph" }],
            },
          ]}
          lang="fr"
        />
        <SearchScoreFilterCard label="Score" value={0.5} onChange={onChange} />
        <SearchReferenceFilterCard label="Reference" value="" onChange={onChange} placeholder="ref" />
        <SearchSortFilterCard
          label="Tri"
          options={[{ value: "desc", label: "Desc" }, { value: "asc", label: "Asc" }]}
          currentValue="desc"
          onChange={onChange}
          getOptionClassName={(_, active) => (active ? "active" : "")}
        />
        <SearchGuideSectionHeader eyebrowId="eyebrow" eyebrow="Eyebrow" title="Title" description="Description" />
        <SearchGuideCard icon={<span>Icon</span>} label="Label" title="Guide" description="Description" note="Note" />
      </>,
    );

    fireEvent.click(screen.getByLabelText("Info"));
    fireEvent.click(screen.getByText("Reset"));
    fireEvent.change(screen.getByPlaceholderText("caption"), { target: { value: "lung" } });
    fireEvent.click(screen.getByText("X-ray"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "C1" } });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.9" } });
    fireEvent.click(screen.getByText("Asc"));

    expect(onChange).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });

  it("handles language selector and navigation interactions", () => {
    const setLanguage = vi.fn();
    const setTheme = vi.fn();
    const onPageChange = vi.fn();

    renderWithProviders(
      <>
        <LanguageSelector />
        <Navigation currentPage="home" onPageChange={onPageChange} tone="primary" />
      </>,
      {
        langValue: { lang: "fr", setLanguage },
        themeValue: { theme: "light", setTheme },
      },
    );

    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    fireEvent.click(screen.getByText("Sombre"));
    fireEvent.click(screen.getByText("English"));
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    fireEvent.mouseDown(document.body);
    fireEvent.click(screen.getByAltText("LOGO").closest("button"));

    expect(setTheme).toHaveBeenCalled();
    expect(setLanguage).toHaveBeenCalledWith("en");
    expect(onPageChange).toHaveBeenCalledWith("home");
  });

  it("submits contact messages and shows API errors", async () => {
    sendContactMessage.mockResolvedValueOnce({ ok: true });
    const { rerender } = renderWithProviders(<ContactPage />);

    const nameInput = screen.getByLabelText(/Nom/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const subjectInput = screen.getByLabelText(/Objet/i);
    const messageInput = screen.getByLabelText(/Message/i);

    [nameInput, emailInput, subjectInput, messageInput].forEach((field) => {
      fireEvent.focus(field);
      fireEvent.blur(field);
    });

    fireEvent.change(nameInput, { target: { value: "Ada" } });
    fireEvent.change(emailInput, { target: { value: "ada@example.com" } });
    fireEvent.change(subjectInput, { target: { value: "Question" } });
    fireEvent.change(messageInput, { target: { value: "Bonjour" } });
    fireEvent.click(screen.getByRole("button", { name: fr.contact.formSubmit }));

    await waitFor(() => expect(sendContactMessage).toHaveBeenCalled());
    expect(screen.getByText(fr.contact.sentTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByText(fr.contact.sentAnother));
    sendContactMessage.mockRejectedValueOnce(new Error("Boom"));
    rerender(<ContactPage />);
    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/Objet/i), { target: { value: "Question" } });
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: "Bonjour" } });
    fireEvent.click(screen.getByRole("button", { name: fr.contact.formSubmit }));

    await waitFor(() => expect(screen.getByText("Boom")).toBeInTheDocument());
  });

  it("generates, copies and resets clinical conclusions", async () => {
    fetchConclusion.mockResolvedValueOnce({
      conclusion: "- First point\n- Second point\n\nFinal paragraph",
    });

    renderWithProviders(
      <ClinicalConclusion
        searchResult={{ results: resultRows }}
        isAccent
      />,
    );

    fireEvent.click(screen.getByTitle(fr.search.conclusion.expand));
    fireEvent.click(screen.getByText(fr.search.conclusion.generate));

    await waitFor(() => expect(fetchConclusion).toHaveBeenCalled());
    expect(screen.getByText("First point")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(fr.search.conclusion.copy));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    fireEvent.click(screen.getByText(fr.search.conclusion.regenerate));
    expect(screen.getByText(fr.search.conclusion.generate)).toBeInTheDocument();
  });

  it("shows clinical conclusion empty and API error states", async () => {
    const { rerender } = renderWithProviders(<ClinicalConclusion searchResult={{ results: [] }} />);

    fireEvent.click(screen.getByTitle(fr.search.conclusion.expand));
    fireEvent.click(screen.getByText(fr.search.conclusion.generate));
    expect(screen.getByText(fr.search.conclusion.noResults)).toBeInTheDocument();

    fetchConclusion.mockRejectedValueOnce(new Error("LLM down"));
    rerender(<ClinicalConclusion searchResult={{ results: resultRows }} />);
    fireEvent.click(screen.getByText(fr.search.conclusion.generate));

    await waitFor(() => expect(screen.getByText("LLM down")).toBeInTheDocument());
  });
});
