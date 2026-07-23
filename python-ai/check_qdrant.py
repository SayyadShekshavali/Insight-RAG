from qdrant_client import QdrantClient

def main():
    print("Connecting to local Qdrant...")
    client = QdrantClient(path="./qdrant_storage")
    
    collections = list(client._client.collections.keys())
    print(f"Active Collections: {collections}")
    
    for c_name in collections:
        print(f"\n--- Scroll collection '{c_name}' ---")
        points, _ = client.scroll(
            collection_name=c_name,
            limit=20,
            with_payload=True,
            with_vectors=False
        )
        print(f"Found {len(points)} points in collection:")
        for idx, p in enumerate(points):
            print(f"Point {idx+1}: ID={p.id} | Payload={p.payload}")

if __name__ == "__main__":
    main()
