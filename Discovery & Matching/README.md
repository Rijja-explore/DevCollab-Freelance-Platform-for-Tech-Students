# DevCollab Auth Service

Authentication and identity microservice for DevCollab.

Run locally:

```powershell
cd devcollab-auth
./mvnw clean verify
```

If Maven is not installed, use Docker instead:

```powershell
cd devcollab-auth
docker compose up --build
```

That path builds the app inside a Maven container, so no local Maven install is required.
