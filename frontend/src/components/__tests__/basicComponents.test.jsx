/**
 * @fileoverview Basic component rendering tests for small reusable UI pieces.
 *
 * This suite covers presentational pages and small UI pieces: static content,
 * FAQ state, footer callbacks, home/search hub entry points, status messages,
 * spinners, and mode icons.
 * @module components/tests/basicComponentsTest
 */

import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AboutPage from "../AboutPage";
import DemosShowcase from "../DemosShowcase";
import FAQPage from "../FAQPage";
import FeaturesShowcase from "../FeaturesShowcase";
import Footer from "../Footer";
import HomePage from "../HomePage";
import HowItWorks from "../HowItWorks";
import SearchHubView from "../SearchHubView";
import Spinner from "../Spinner";
import StatusBar from "../StatusBar";
import { InterpretiveModeIcon, VisualModeIcon } from "../icons";
import { fr } from "../../i18n/fr";
import { renderWithProviders } from "../../test/renderWithProviders";

describe("basic presentational components", () => {
  it("renders static informational pages", () => {
    renderWithProviders(
      <>
        <AboutPage />
        <HowItWorks />
        <FeaturesShowcase embedded />
        <DemosShowcase embedded onNavigate={vi.fn()} />
        <FAQPage onPageChange={vi.fn()} />
      </>,
    );

    expect(screen.getAllByText(/MEDISCAN/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Recherche/i).length).toBeGreaterThan(0);
  });

  it("handles FAQ tabs, accordion, fallback and contact CTA", () => {
    const onPageChange = vi.fn();
    const { unmount } = renderWithProviders(
      <FAQPage onPageChange={onPageChange} />,
    );

    fireEvent.click(screen.getByText(fr.faq.categories.technical));
    fireEvent.click(screen.getAllByRole("button").find((button) => button.textContent.includes("?")));
    fireEvent.click(screen.getAllByRole("button").find((button) => button.textContent.includes("?")));
    fireEvent.click(screen.getByText(fr.faq.categories.general));
    fireEvent.click(screen.getByText("Quel jeu de données est utilisé ?"));
    expect(screen.getByText("En savoir plus sur ROCO v2")).toBeInTheDocument();

    fireEvent.click(screen.getByText(fr.faq.contactBtn));
    expect(onPageChange).toHaveBeenCalledWith("contact");

    unmount();
    renderWithProviders(<FAQPage onPageChange={onPageChange} />, {
      langValue: { t: { ...fr, faq: null } },
    });
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });

  it("renders AboutPage image fallbacks and dark mission assets", async () => {
    const customAbout = {
      ...fr.about,
      mission: { ...fr.about.mission, image: "/mission-light.png", image_d: "/mission-dark.png" },
      vision: { ...fr.about.vision, image: "" },
      team: {
        title: "Equipe",
        members: [
          { name: "Ada Lovelace", role: "Dev", color: "visual", photo: "/ada.png", github: "https://github.com/ada" },
          { name: "Grace Hopper", role: "Dev", color: "semantic" },
        ],
      },
    };

    renderWithProviders(<AboutPage />, {
      langValue: { t: { ...fr, about: customAbout } },
      themeValue: { theme: "dark" },
    });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(screen.getByAltText(fr.about.mission.title)).toHaveAttribute("src", "/mission-dark.png");
    expect(screen.getByText("Image à venir")).toBeInTheDocument();

    fireEvent.error(screen.getByAltText("Ada Lovelace"));
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.getByText("GH")).toBeInTheDocument();
  });

  it("renders footer links and emits navigation callbacks", () => {
    const onPageChange = vi.fn();
    renderWithProviders(<Footer onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Contact/i }));

    expect(onPageChange).toHaveBeenCalled();
  });

  it("renders the home page and search hub actions", () => {
    const onPageChange = vi.fn();
    const onChooseImage = vi.fn();
    const onChooseText = vi.fn();

    renderWithProviders(
      <>
        <HomePage onPageChange={onPageChange} onSearchViewChange={vi.fn()} onSearchToneChange={vi.fn()} />
        <SearchHubView onChooseImage={onChooseImage} onChooseText={onChooseText} />
      </>,
    );

    fireEvent.click(screen.getAllByRole("button").find((button) => button.textContent.includes("Scanner")));
    expect(onPageChange).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Analyser une image").closest("button"));
    fireEvent.click(screen.getByText("Décrire un cas").closest("button"));
    expect(onChooseImage).toHaveBeenCalled();
    expect(onChooseText).toHaveBeenCalled();
  });

  it("renders status, spinner and mode icons across variants", () => {
    const { container, rerender } = renderWithProviders(
      <>
        <Spinner label="Chargement" tone="accent" size="lg" inline />
        <StatusBar status={{ type: "loading", message: "Loading" }} tone="primary" useHomeVisualTone />
        <StatusBar status={{ type: "error", message: "Error" }} tone="accent" enableToneTransition />
        <VisualModeIcon className="visual-icon" />
        <InterpretiveModeIcon className="semantic-icon" />
      </>,
    );

    expect(screen.getByText("Chargement")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.getByRole("alert")).toHaveTextContent("Error");
    expect(container.querySelector(".visual-icon")).toBeTruthy();

    rerender(<StatusBar status={null} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
