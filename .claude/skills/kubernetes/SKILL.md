---
name: kubernetes
description: Kubernetes manifests, Helm charts, scaling strategies, service mesh, and cluster management
layer: domain
category: devops
triggers:
  - "kubernetes"
  - "k8s"
  - "helm"
  - "kubectl"
  - "pod"
  - "deployment manifest"
  - "cluster"
  - "ingress"
inputs: [application containers, scaling requirements, infrastructure constraints]
outputs: [K8s manifests, Helm charts, scaling configurations, RBAC policies]
linksTo: [docker, monitoring, terraform, nginx, cicd]
linkedFrom: [ship, optimize, infrastructure]
preferredNextSkills: [monitoring, terraform, cicd]
fallbackSkills: [docker, vercel]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [cluster deployments, resource provisioning]
---

# Kubernetes Specialist

## Purpose

Design and produce production-grade Kubernetes configurations including deployments, services, ingress, Helm charts, autoscaling, RBAC, and operational patterns for managing containerized workloads at scale.

## Key Patterns

### Production Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production
  labels:
    app.kubernetes.io/name: app
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/managed-by: helm
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: app
  template:
    metadata:
      labels:
        app.kubernetes.io/name: app
    spec:
      serviceAccountName: app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: app
          image: registry.example.com/app:1.0.0
          ports:
            - containerPort: 3000
              protocol: TCP
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: app
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### Ingress with TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
```

### Helm Chart Structure

```
chart/
  Chart.yaml
  values.yaml
  values-staging.yaml
  values-production.yaml
  templates/
    _helpers.tpl
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    configmap.yaml
    secret.yaml
    serviceaccount.yaml
    pdb.yaml
```

## Best Practices

### Resource Management
- Always set resource requests AND limits
- Use `LimitRange` and `ResourceQuota` per namespace
- Start with requests = observed p50, limits = observed p99 + headroom
- Use Vertical Pod Autoscaler (VPA) in recommend mode to size pods

### Reliability
- Use PodDisruptionBudgets (PDB) with `minAvailable: 50%` or similar
- Spread pods across zones using `topologySpreadConstraints`
- Define both liveness and readiness probes (different endpoints)
- Use `preStop` hooks for graceful shutdown
- Set `terminationGracePeriodSeconds` to match app drain time

### Security
- Use `securityContext.runAsNonRoot: true`
- Drop all capabilities, add only what's needed
- Use NetworkPolicies to restrict pod-to-pod communication
- Use ServiceAccounts with minimal RBAC roles
- Scan images in CI, enforce policies with OPA/Kyverno

### Secrets
- Never store secrets in ConfigMaps or manifests
- Use External Secrets Operator with AWS Secrets Manager / Vault
- Rotate secrets without pod restarts using CSI Secret Store driver

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| No resource limits | Always set requests and limits |
| Liveness probe on app startup path | Use `startupProbe` for slow-starting apps |
| Same endpoint for liveness and readiness | Liveness: "am I alive?"; readiness: "can I serve traffic?" |
| No PDB | Add PDB to prevent full unavailability during upgrades |
| Hardcoded image tags | Use SHA digests or versioned tags, never `latest` |
| Secrets in ConfigMap | Use Secrets resource or External Secrets |
| Single-zone deployment | Use topology spread constraints |

## Examples

### PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app.kubernetes.io/name: app
```

### NetworkPolicy (Allow Only Ingress)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: app
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
```

### Useful kubectl Commands

```bash
# Rolling restart
kubectl rollout restart deployment/app -n production

# Check rollout status
kubectl rollout status deployment/app -n production

# View pod resource usage
kubectl top pods -n production --sort-by=memory

# Debug failing pod
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production --previous

# Port forward for debugging
kubectl port-forward svc/app-service 3000:80 -n production
```
