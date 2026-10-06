import importlib
import os
import unittest


class DatabaseBackendTestCase(unittest.TestCase):
    def setUp(self):
        self.original_database_url = os.environ.get("DATABASE_URL")
        self.original_supabase_url = os.environ.get("SUPABASE_URL")
        self.original_supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    def tearDown(self):
        if self.original_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = self.original_database_url

        if self.original_supabase_url is None:
            os.environ.pop("SUPABASE_URL", None)
        else:
            os.environ["SUPABASE_URL"] = self.original_supabase_url

        if self.original_supabase_key is None:
            os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
        else:
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = self.original_supabase_key

    def test_defaults_to_sqlite_when_no_database_url_is_set(self):
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("SUPABASE_URL", None)
        os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)

        import database
        importlib.reload(database)

        self.assertEqual(database.get_db_backend(), "sqlite")

    def test_postgres_backend_is_detected_when_database_url_exists(self):
        os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/testdb"
        os.environ.pop("SUPABASE_URL", None)
        os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)

        import database
        importlib.reload(database)

        self.assertEqual(database.get_db_backend(), "postgres")


if __name__ == "__main__":
    unittest.main()
