from __future__ import annotations

import argparse
import json

from app.services.demo_data_service import demo_data_service


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Chinese demo documents for the RAG knowledge base.")
    parser.add_argument(
        "--skip-web",
        action="store_true",
        help="Only generate local demo documents and skip fetching Chinese official web documents.",
    )
    args = parser.parse_args()

    result = demo_data_service.prepare_cn_demo_data(include_web=not args.skip_web)

    print("Chinese demo data prepared successfully.")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
