---
name: hss-minio-storage
description: MinIO object-storage integration skill for HSS. Use when implementing or reviewing S3-compatible adapters, bucket bootstrap logic, private-by-default storage controls, presigned URL boundaries, and upload/download safety in API flows.
---

# HSS MinIO Storage

Use this skill to keep object storage integration secure, explicit, and maintainable.

## Workflow

1. Read storage configuration from centralized env/config module.
2. Initialize MinIO client in isolated storage adapter/module.
3. Ensure bucket existence during API bootstrap:
   - check bucket from env
   - create bucket if missing
4. Apply private-by-default behavior for objects and bucket access.
5. Expose uploads/downloads through controlled API flows (for example presigned URLs).
6. Validate file type/size boundaries before allowing upload workflows.

## HSS Baseline

- Bucket env variable: `MINIO_BUCKET_NAME`
- Local expected bucket name: `hss_bucket`
- Bucket management should happen during API startup bootstrap path.

## Security Rules

- Do not expose broad public bucket policies by default.
- Keep credentials only in env/config, never in code.
- Keep upload validation explicit (type, size, safety seam for malware scan).
- Log only technical identifiers, not sensitive file metadata.
