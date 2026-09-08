package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/reshnyakdg/expence-tracker/backend/internal/domain"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/dto"
)

func (s *Service) ListSpaces(ctx context.Context, userID uuid.UUID) ([]dto.Space, error) {
	spaces, err := s.store.Spaces().ListForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return mapSlice(spaces, spaceToDTO), nil
}

func (s *Service) CreateSpace(ctx context.Context, userID uuid.UUID, in dto.SpaceInput) (dto.Space, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return dto.Space{}, fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	currency := strings.ToUpper(strings.TrimSpace(in.Currency))
	if currency == "" {
		currency = "USD"
	}
	if len(currency) != 3 {
		return dto.Space{}, fmt.Errorf("%w: currency must be a 3-letter code", domain.ErrValidation)
	}

	var created domain.Space
	err := s.store.WithTx(ctx, func(st domain.Store) error {
		sp, err := st.Spaces().Create(ctx, name, userID, currency)
		if err != nil {
			return err
		}
		if _, err := st.Spaces().AddMember(ctx, sp.ID, userID, domain.RoleOwner); err != nil {
			return err
		}
		created = sp
		return nil
	})
	if err != nil {
		return dto.Space{}, err
	}
	return spaceToDTO(created), nil
}

func (s *Service) GetSpace(ctx context.Context, userID, spaceID uuid.UUID) (dto.Space, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.Space{}, err
	}
	sp, err := s.store.Spaces().Get(ctx, spaceID)
	if err != nil {
		return dto.Space{}, err
	}
	return spaceToDTO(sp), nil
}

func (s *Service) ListMembers(ctx context.Context, userID, spaceID uuid.UUID) ([]dto.SpaceMember, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return nil, err
	}
	members, err := s.store.Spaces().ListMembers(ctx, spaceID)
	if err != nil {
		return nil, err
	}
	return mapSlice(members, memberToDTO), nil
}

func (s *Service) AddMember(ctx context.Context, userID, spaceID uuid.UUID, in dto.AddMemberInput) (dto.SpaceMember, error) {
	if err := s.assertMember(ctx, spaceID, userID); err != nil {
		return dto.SpaceMember{}, err
	}

	role := strings.TrimSpace(in.Role)
	if role == "" {
		role = domain.RoleMember
	}
	if role != domain.RoleMember && role != domain.RoleOwner {
		return dto.SpaceMember{}, fmt.Errorf("%w: role must be 'owner' or 'member'", domain.ErrValidation)
	}
	if role == domain.RoleOwner {
		callerRole, _, err := s.memberRole(ctx, spaceID, userID)
		if err != nil {
			return dto.SpaceMember{}, err
		}
		if callerRole != domain.RoleOwner {
			return dto.SpaceMember{}, fmt.Errorf("%w: only an owner can grant the owner role", domain.ErrForbidden)
		}
	}

	target, err := s.store.Users().GetByEmail(ctx, strings.TrimSpace(strings.ToLower(in.Email)))
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return dto.SpaceMember{}, fmt.Errorf("%w: no user with that email has signed in yet", domain.ErrValidation)
		}
		return dto.SpaceMember{}, err
	}

	m, err := s.store.Spaces().AddMember(ctx, spaceID, target.ID, role)
	if err != nil {
		return dto.SpaceMember{}, err
	}
	m.User = target
	return memberToDTO(m), nil
}
