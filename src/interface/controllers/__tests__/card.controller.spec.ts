import { Test, TestingModule } from "@nestjs/testing";
import { CardController } from "../card.controller";
import { CardService } from "../../../application/services/card.service";
import { CardSchedulerService } from "../../../application/services/card-scheduler.service";
import { AuthGuard } from "../../../application/guards/auth.guard";
import { CardLocationDto } from "../../../application/dtos/card";
import { BadRequestException } from "@nestjs/common";

describe("CardController", () => {
	let controller: CardController;
	let cardService: CardService;
	let cardSchedulerService: CardSchedulerService;

	// Mock de CardService
	const mockCardService = {
		create: jest.fn(),
		findAll: jest.fn(),
		findAvailableCards: jest.fn(),
		findOne: jest.fn(),
		findLocationHistory: jest.fn(),
		update: jest.fn(),
		remove: jest.fn(),
		assignToVisitor: jest.fn(),
		unassignFromVisitor: jest.fn(),
		recordLocation: jest.fn(),
		getLastLocation: jest.fn(),
		getNearbyCards: jest.fn(),
	};

	// Mock de CardSchedulerService
	const mockCardSchedulerService = {
		findCardByNumber: jest.fn(),
		registerCard: jest.fn(),
		receiveCardLocation: jest.fn(),
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			controllers: [CardController],
			providers: [
				{
					provide: CardService,
					useValue: mockCardService,
				},
				{
					provide: CardSchedulerService,
					useValue: mockCardSchedulerService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: jest.fn(() => true) })
			.compile();

		controller = module.get<CardController>(CardController);
		cardService = module.get<CardService>(CardService);
		cardSchedulerService =
			module.get<CardSchedulerService>(CardSchedulerService);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("recordLocation", () => {
		it("should call cardService.recordLocation with correct parameters", async () => {
			// Mock setup
			const cardId = "card123";
			const locationDto: CardLocationDto = {
				latitude: 40.7128,
				longitude: -74.006,
				accuracy: 10.5,
			};

			const savedLocation = {
				id: "loc456",
				card: { id: cardId },
				...locationDto,
				timestamp: new Date(),
			};

			mockCardService.recordLocation.mockResolvedValue(savedLocation);

			// Call controller
			const result = await controller.recordLocation(cardId, locationDto);

			// Verify
			expect(mockCardService.recordLocation).toHaveBeenCalledWith(
				cardId,
				locationDto.latitude,
				locationDto.longitude,
				locationDto.accuracy,
			);
			expect(result).toEqual(savedLocation);
		});

		it("should handle errors when recording location", async () => {
			// Mock setup
			const cardId = "card123";
			const locationDto: CardLocationDto = {
				latitude: 40.7128,
				longitude: -74.006,
			};

			mockCardService.recordLocation.mockRejectedValue(
				new BadRequestException("La tarjeta no existe"),
			);

			// Call controller
			await expect(
				controller.recordLocation(cardId, locationDto),
			).rejects.toThrow(BadRequestException);

			expect(mockCardService.recordLocation).toHaveBeenCalledWith(
				cardId,
				locationDto.latitude,
				locationDto.longitude,
				undefined,
			);
		});
	});

	describe("findLocations", () => {
		it("should call cardService.findLocationHistory with correct parameters", async () => {
			// Mock setup
			const cardId = "card123";
			const locations = [
				{
					id: "loc1",
					latitude: 40.7128,
					longitude: -74.006,
					accuracy: 10.5,
					timestamp: new Date(),
				},
				{
					id: "loc2",
					latitude: 40.7129,
					longitude: -74.007,
					accuracy: 9.8,
					timestamp: new Date(),
				},
			];

			mockCardService.findLocationHistory.mockResolvedValue(locations);

			// Call controller
			const result = await controller.findLocations(cardId);

			// Verify
			expect(mockCardService.findLocationHistory).toHaveBeenCalledWith(cardId);
			expect(result).toEqual(locations);
		});
	});

	describe("findNearbyCards", () => {
		it("should call cardService.getNearbyCards with correct parameters", async () => {
			// Mock setup
			const latitude = 40.7128;
			const longitude = -74.006;
			const radius = 100;

			const nearbyCards = [
				{
					id: "card1",
					card_number: "CARD-123",
					latitude: 40.7129,
					longitude: -74.005,
					distance_meters: 25,
				},
				{
					id: "card2",
					card_number: "CARD-456",
					latitude: 40.713,
					longitude: -74.008,
					distance_meters: 75,
				},
			];

			mockCardService.getNearbyCards.mockResolvedValue(nearbyCards);

			// Call controller
			const result = await controller.findNearbyCards(
				latitude,
				longitude,
				radius,
			);

			// Verify
			expect(mockCardService.getNearbyCards).toHaveBeenCalledWith(
				latitude,
				longitude,
				radius,
			);
			expect(result).toEqual(nearbyCards);
		});

		it("should use default radius when not provided", async () => {
			// Mock setup
			const latitude = 40.7128;
			const longitude = -74.006;
			const defaultRadius = 100; // Default value in controller

			mockCardService.getNearbyCards.mockResolvedValue([]);

			// Call controller without radius
			await controller.findNearbyCards(latitude, longitude);

			// Verify
			expect(mockCardService.getNearbyCards).toHaveBeenCalledWith(
				latitude,
				longitude,
				defaultRadius,
			);
		});
	});

	describe("getLastLocation", () => {
		it("should call cardService.getLastLocation with correct parameters", async () => {
			// Mock setup
			const cardId = "card123";
			const location = {
				id: "loc456",
				latitude: 40.7128,
				longitude: -74.006,
				accuracy: 10.5,
				timestamp: new Date(),
			};

			mockCardService.getLastLocation.mockResolvedValue(location);

			// Call controller
			const result = await controller.getLastLocation(cardId);

			// Verify
			expect(mockCardService.getLastLocation).toHaveBeenCalledWith(cardId);
			expect(result).toEqual(location);
		});

		it("should return null when no location is found", async () => {
			// Mock setup
			const cardId = "card123";

			mockCardService.getLastLocation.mockResolvedValue(null);

			// Call controller
			const result = await controller.getLastLocation(cardId);

			// Verify
			expect(mockCardService.getLastLocation).toHaveBeenCalledWith(cardId);
			expect(result).toBeNull();
		});
	});
});
