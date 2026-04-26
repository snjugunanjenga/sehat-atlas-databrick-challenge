import { useEffect, useState } from "react";
import { FacilitySlim, loadFacilities } from "@/data/facilities";

export function useFacilities() {
  const [data, setData] = useState<FacilitySlim[] | null>(null);
  useEffect(() => {
    let mounted = true;
    loadFacilities().then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, []);
  return data;
}
