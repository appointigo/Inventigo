"use client";

import React, { useState, useEffect, memo, useCallback } from "react";
import type { PricingPlan } from "../../types";
import {
  ModalBackdrop, ModalBox, ModalHeader, ModalIconWrap, ModalTitle, ModalClose,
  ModalBody, FormRow, FormGroup, FormLabel, FormInput, FormHint,
  FeaturesLabel, FeatureTogglesGrid, FeatureToggleRow, ToggleLabel, ToggleSwitch,
  ModalFooter, ModalBtnCancel, ModalBtnSave,
} from "./PlatformAdminPricingPlans.styled";

interface Props {
  plan: PricingPlan | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: PricingPlan) => void;
  isCreating?: boolean;
}

const PlatformAdminEditPlanModal = memo(function PlatformAdminEditPlanModal({
  plan,
  open,
  onClose,
  onSave,
  isCreating = false,
}: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [maxUsers, setMaxUsers] = useState(5);
  const [maxStores, setMaxStores] = useState(1);
  const [maxProducts, setMaxProducts] = useState(100);
  const [features, setFeatures] = useState(plan?.features ?? []);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setPrice(plan.price);
      setMaxUsers(plan.maxUsers);
      setMaxStores(plan.maxStores);
      setMaxProducts(plan.maxProducts);
      setFeatures(plan.features);
    }
  }, [plan]);

  const toggleFeature = useCallback((key: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }, []);

  const handleSave = () => {
    if (!plan) return;
    onSave({
      ...plan,
      name,
      price,
      maxUsers,
      maxStores,
      maxProducts,
      features,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!plan) return null;

  return (
    <ModalBackdrop open={open} onClick={handleBackdropClick}>
      <ModalBox open={open}>
        <ModalHeader>
          <ModalIconWrap>⚡</ModalIconWrap>
          <ModalTitle>{isCreating ? "Create New Plan" : `Edit ${plan.name} Plan`}</ModalTitle>
          <ModalClose onClick={onClose}>✕</ModalClose>
        </ModalHeader>

        <ModalBody>
          <FormRow>
            <FormGroup>
              <FormLabel>Plan Name</FormLabel>
              <FormInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Starter"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Price ($/month)</FormLabel>
              <FormInput
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min={0}
              />
              <FormHint>Set 0 for free plans</FormHint>
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <FormLabel>Max Users</FormLabel>
              <FormInput
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                min={-1}
              />
              <FormHint>-1 for unlimited</FormHint>
            </FormGroup>
            <FormGroup>
              <FormLabel>Max Stores</FormLabel>
              <FormInput
                type="number"
                value={maxStores}
                onChange={(e) => setMaxStores(Number(e.target.value))}
                min={-1}
              />
              <FormHint>-1 for unlimited</FormHint>
            </FormGroup>
          </FormRow>

          <FormGroup>
            <FormLabel>Max Products</FormLabel>
            <FormInput
              type="number"
              value={maxProducts}
              onChange={(e) => setMaxProducts(Number(e.target.value))}
              min={-1}
            />
            <FormHint>-1 for unlimited</FormHint>
          </FormGroup>

          <FormGroup>
            <FeaturesLabel>Included Features</FeaturesLabel>
            <FeatureTogglesGrid>
              {features.map((f) => (
                <FeatureToggleRow
                  key={f.key}
                  on={f.enabled}
                  onClick={() => toggleFeature(f.key)}
                >
                  <ToggleLabel>{f.label}</ToggleLabel>
                  <ToggleSwitch on={f.enabled} />
                </FeatureToggleRow>
              ))}
            </FeatureTogglesGrid>
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <ModalBtnCancel onClick={onClose}>Cancel</ModalBtnCancel>
          <ModalBtnSave onClick={handleSave}>Save Changes</ModalBtnSave>
        </ModalFooter>
      </ModalBox>
    </ModalBackdrop>
  );
});

export default PlatformAdminEditPlanModal;
