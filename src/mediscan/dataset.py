"""
Outils de gestion pour les métadonnées du dataset ROCOv2.

Ce module fournit les structures de données et les outils de chargement
pour manipuler les métadonnées du dataset ROCOv2 utilisé par MediScan AI.
Chaque image est représentée par un identifiant, un chemin, une légende
médicale et des codes CUI (Concept Unique Identifier UMLS).
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


@dataclass(frozen=True)
class MetadataRecord:
    """
    Représente une ligne unique de métadonnées pour une image médicale ROCOv2.

    Attributes:
        image_id (str): Identifiant unique de l'image (ex: 'ROCOv2_2023_train_000001').
        path (str): Chemin relatif vers le fichier image depuis la racine du projet.
        caption (str): Légende médicale descriptive de l'image en anglais.
        cui (str): Codes CUI UMLS associés à l'image, sérialisés en JSON
            (ex: '["C0040405"]'). Peut être vide si aucun concept n'est identifié.
    """
    image_id: str
    path: str
    caption: str
    cui: str

    def to_dict(self) -> dict[str, str]:
        """
        Convertit l'enregistrement en dictionnaire sérialisable.

        Returns:
            dict[str, str]: Dictionnaire avec les clés 'image_id', 'path',
                'caption' et 'cui'.
        """
        return {
            "image_id": self.image_id,
            "path": self.path,
            "caption": self.caption,
            "cui": self.cui,
        }


class RocoDataset:
    """
    Chargeur en mémoire pour les métadonnées du dataset ROCOv2.

    Charge et valide l'intégralité du fichier metadata.csv au moment
    de l'initialisation. L'ordre d'itération est déterministe et correspond
    à l'ordre des lignes dans le CSV, garantissant la reproductibilité
    de la construction des index FAISS.

    Attributes:
        metadata_csv (Path): Chemin vers le fichier metadata.csv chargé.

    Example:
        >>> dataset = RocoDataset("data/roco_train_full/metadata.csv")
        >>> print(len(dataset))
        59962
        >>> for record in dataset:
        ...     print(record.image_id)
    """
    REQUIRED_COLUMNS = ("image_id", "path", "caption", "cui")

    def __init__(
        self,
        metadata_csv: str | Path = "data/roco_train_full/metadata.csv",
    ) -> None:
        """
        Initialise le dataset en chargeant et validant le fichier CSV.

        Args:
            metadata_csv (str | Path): Chemin vers le fichier metadata.csv.
                Défaut : 'data/roco_train_full/metadata.csv'.

        Raises:
            FileNotFoundError: Si le fichier metadata.csv n'existe pas.
            ValueError: Si le fichier CSV est vide, manque des colonnes requises,
                ou contient des lignes avec image_id ou path manquants.
        """
        self.metadata_csv = Path(metadata_csv)
        if not self.metadata_csv.exists():
            raise FileNotFoundError(f"Metadata CSV not found: {self.metadata_csv}")
        self._records = self._load_records()

    def _load_records(self) -> list[MetadataRecord]:
        """
        Charge et valide les métadonnées depuis le fichier CSV.

        Vérifie la présence des colonnes requises et la validité de chaque
        ligne (image_id et path obligatoires). Les champs caption et cui
        peuvent être vides.

        Returns:
            list[MetadataRecord]: Liste ordonnée de tous les enregistrements
                valides du dataset.

        Raises:
            ValueError: Si le CSV n'a pas d'en-tête, si des colonnes requises
                sont manquantes, ou si une ligne a un image_id ou path vide.
        """
        records: list[MetadataRecord] = []

        with self.metadata_csv.open("r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            if reader.fieldnames is None:
                raise ValueError(f"CSV file has no header: {self.metadata_csv}")

            missing_columns = [
                column for column in self.REQUIRED_COLUMNS
                if column not in reader.fieldnames
            ]
            if missing_columns:
                raise ValueError(
                    f"CSV missing required columns {missing_columns} in {self.metadata_csv}"
                )

            for row_number, row in enumerate(reader, start=2):
                image_id = (row.get("image_id") or "").strip()
                image_path = (row.get("path") or "").strip()
                caption = (row.get("caption") or "").strip()
                cui = (row.get("cui") or "").strip()

                if not image_id or not image_path:
                    raise ValueError(
                        f"Invalid row {row_number} in {self.metadata_csv}: "
                        "image_id and path are required"
                    )

                records.append(
                    MetadataRecord(
                        image_id=image_id,
                        path=image_path,
                        caption=caption,
                        cui=cui,
                    )
                )

        return records

    def __len__(self) -> int:
        """
        Retourne le nombre total d'enregistrements dans le dataset.

        Returns:
            int: Nombre d'images indexées dans le dataset.
        """
        return len(self._records)

    def __iter__(self) -> Iterator[MetadataRecord]:
        """
        Itère sur les enregistrements du dataset dans l'ordre du CSV.

        Returns:
            Iterator[MetadataRecord]: Itérateur sur les enregistrements.
        """
        return iter(self._records)

    @property
    def records(self) -> list[MetadataRecord]:
        """
        Retourne une copie de la liste de tous les enregistrements.

        Returns:
            list[MetadataRecord]: Copie de la liste complète des enregistrements.
        """
        return list(self._records)


__all__ = ["MetadataRecord", "RocoDataset"]