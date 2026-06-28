from dotenv import load_dotenv

from agents.library_store import import_excel_libraries

load_dotenv()


if __name__ == "__main__":
    result = import_excel_libraries()
    print("Imported library records:")
    for name, count in result.items():
        print(f"- {name}: {count}")
