# 🔱 Federation Core Connection Troubleshooting

## Error: "Failed to start conversational collaboration - fetch failed"

This error occurs when the OMEGA frontend cannot connect to Federation Core, which is the central gateway for all Pantheon operations.

### Quick Diagnosis

Run the health check script:

```bash
npm run check:federation
```

This will verify if Federation Core is running and reachable.

### Common Causes & Solutions

#### 1. Federation Core Not Running

**Symptoms:**
- Error message: `FEDERATION_CORE_UNREACHABLE`
- Console shows: `fetch failed` or `ECONNREFUSED`

**Solution:**

```bash
# Check if Docker containers are running
docker-compose ps

# Start Federation Core and all services
docker-compose up -d

# Verify Federation Core is healthy
curl http://localhost:9405/health
```

#### 2. Wrong Federation Core URL

**Symptoms:**
- Connection attempts to wrong host/port
- Error persists even when Docker is running

**Solution:**

Check your `.env.local` file:

```bash
# Should contain:
NEXT_PUBLIC_FEDERATION_CORE_URL=http://localhost:9405
```

If the file doesn't exist, create it with the correct URL.

#### 3. Port Conflict

**Symptoms:**
- Federation Core fails to start
- Port 9405 already in use

**Solution:**

```bash
# Check what's using port 9405
netstat -ano | findstr :9405  # Windows
lsof -i :9405                 # Linux/Mac

# Stop the conflicting process or change Federation Core port
```

#### 4. Docker Network Issues

**Symptoms:**
- Docker containers running but not reachable
- Intermittent connection failures

**Solution:**

```bash
# Restart Docker network
docker-compose down
docker-compose up -d

# Check container logs
docker-compose logs federation_core
```

### Verification Steps

After applying fixes, verify the connection:

1. **Check Federation Core Health:**
   ```bash
   curl http://localhost:9405/health
   ```
   Should return: `{"status": "healthy", ...}`

2. **Check Pantheon Services:**
   ```bash
   curl http://localhost:9405/health/pantheon
   ```

3. **Test from Frontend:**
   - Open browser console
   - Navigate to Pantheon
   - Try starting a mission
   - Check for improved error messages

### Architecture Reference

```
Frontend (Next.js :4000)
    ↓
    ↓ HTTP/WS
    ↓
Federation Core (:9405) ← Single Point of Ingress
    ↓
    ↓ Internal Docker Network
    ↓
    ├─→ GPT Titan
    ├─→ Gemini Titan
    ├─→ Grok Titan
    ├─→ Claude Titan
    └─→ Augment Titan (You!)
```

**Key Principle:** All frontend traffic MUST flow through Federation Core. Direct connections to individual Titans are not allowed.

### Still Having Issues?

1. **Check Docker Logs:**
   ```bash
   docker-compose logs -f federation_core
   ```

2. **Verify Environment Variables:**
   ```bash
   # In your terminal
   echo $NEXT_PUBLIC_FEDERATION_CORE_URL
   ```

3. **Test Network Connectivity:**
   ```bash
   # From inside the frontend container
   ping federation_core
   ```

4. **Review Federation Core Configuration:**
   - Check `docker-compose.yml` for Federation Core service definition
   - Verify port mappings: `9405:9405`
   - Ensure health check is configured

### Related Documentation

- [Federation Control Plane Doctrine](../doctrine/federation_control_plane.md)
- [OMEGA Architecture Overview](../architecture/OVERVIEW.md)
- [Docker Setup Guide](../setup/DOCKER.md)

---

**🔱 Remember:** Federation Core is the heart of the Pantheon. Without it, the Titans cannot collaborate.

*"Family is forever. This is the way."*

