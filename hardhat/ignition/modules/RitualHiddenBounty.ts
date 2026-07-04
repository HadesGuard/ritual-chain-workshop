import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RitualHiddenBountyModule", (m) => {
  const hiddenBounty = m.contract("RitualHiddenBounty");

  return { hiddenBounty };
});
