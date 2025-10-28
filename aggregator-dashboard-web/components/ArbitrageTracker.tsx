"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Search, Play, Square, TrendingUp, DollarSign, Clock } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

interface SearchResult {
	found: boolean;
	team1: string;
	team2: string;
	league: string;
	date?: string;
	has_tie: boolean;
	trackable: boolean;
	kalshi: {
		found: boolean;
		markets: any;
	};
	polymarket: {
		found: boolean;
		markets: any;
	};
}

interface PriceUpdate {
	kalshi: {
		home_yes: { price: number; size: number };
		home_no: { price: number; size: number };
		away_yes: { price: number; size: number };
		away_no: { price: number; size: number };
		tie_yes?: { price: number; size: number };
		tie_no?: { price: number; size: number };
	};
	polymarket: {
		home_yes: { price: number; size: number };
		home_no: { price: number; size: number };
		away_yes: { price: number; size: number };
		away_no: { price: number; size: number };
		tie_yes?: { price: number; size: number };
		tie_no?: { price: number; size: number };
	};
}

interface ArbitrageNotification {
	event_type: string;
	timestamp: string;
	arbitrage?: any;
	execution?: any;
	profit?: number;
}

export default function ArbitrageTracker() {
	const [team1, setTeam1] = useState("");
	const [team2, setTeam2] = useState("");
	const [league, setLeague] = useState("NFL");
	const [date, setDate] = useState("");
	
	const [searching, setSearching] = useState(false);
	const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
	const [searchError, setSearchError] = useState<string | null>(null);
	
	const [tracking, setTracking] = useState(false);
	const [trackingId, setTrackingId] = useState<string | null>(null);
	const [prices, setPrices] = useState<PriceUpdate | null>(null);
	const [arbitrageNotifications, setArbitrageNotifications] = useState<ArbitrageNotification[]>([]);
	
	const wsRef = useRef<WebSocket | null>(null);
	
	const leagues = [
		"NFL", "CFB", "MLB", "NHL", "NBA",
		"EPL", "Serie A", "Bundesliga", "La Liga", "Ligue 1", "Champions League"
	];
	
	// Search for game
	const handleSearch = async () => {
		if (!team1 || !team2 || !league) {
			setSearchError("Please fill in all fields");
			return;
		}
		
		setSearching(true);
		setSearchError(null);
		setSearchResult(null);
		
		try {
			const params = new URLSearchParams({
				team1,
				team2,
				league,
				...(date && { date })
			});
			
			const response = await fetch(`${API_BASE_URL}/arbitrage/search-game?${params}`, {
				method: 'POST'
			});
			
			if (!response.ok) {
				throw new Error('Search failed');
			}
			
			const result = await response.json();
			setSearchResult(result);
			
			if (!result.found) {
				setSearchError(result.message || "Game not found");
			}
		} catch (error) {
			setSearchError("Failed to search. Please check API server is running.");
			console.error(error);
		} finally {
			setSearching(false);
		}
	};
	
	// Start tracking
	const handleStartTracking = async () => {
		if (!searchResult || !searchResult.trackable) return;
		
		try {
			const params = new URLSearchParams({
				team1: searchResult.team1,
				team2: searchResult.team2,
				league: searchResult.league,
				...(searchResult.date && { date: searchResult.date })
			});
			
			const response = await fetch(`${API_BASE_URL}/arbitrage/start-tracking?${params}`, {
				method: 'POST'
			});
			
			if (!response.ok) {
				throw new Error('Failed to start tracking');
			}
			
			const result = await response.json();
			setTrackingId(result.tracking_id);
			setTracking(true);
			
			// Connect to WebSocket
			const ws = new WebSocket(`ws://localhost:8000/ws/tracking/${result.tracking_id}`);
			
			ws.onopen = () => {
				console.log('WebSocket connected');
			};
			
			ws.onmessage = (event) => {
				const data = JSON.parse(event.data);
				
				if (data.type === 'price_update') {
					setPrices(data.data.prices);
				} else if (data.type === 'arbitrage_execution') {
					setArbitrageNotifications(prev => [data.data, ...prev]);
				}
			};
			
			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
			};
			
			ws.onclose = () => {
				console.log('WebSocket closed');
			};
			
			wsRef.current = ws;
			
			// Poll for arbitrage notifications
			const pollNotifications = setInterval(async () => {
				try {
					const res = await fetch(`${API_BASE_URL}/arbitrage/notifications/${result.tracking_id}`);
					if (res.ok) {
						const data = await res.json();
						setArbitrageNotifications(data.notifications);
					}
				} catch (error) {
					console.error('Failed to fetch notifications:', error);
				}
			}, 2000);
			
			// Store interval ID for cleanup
			(wsRef.current as any).pollInterval = pollNotifications;
			
		} catch (error) {
			alert('Failed to start tracking');
			console.error(error);
		}
	};
	
	// Stop tracking
	const handleStopTracking = async () => {
		if (!trackingId) return;
		
		try {
			await fetch(`${API_BASE_URL}/arbitrage/stop-tracking/${trackingId}`, {
				method: 'POST'
			});
			
			// Close WebSocket
			if (wsRef.current) {
				if ((wsRef.current as any).pollInterval) {
					clearInterval((wsRef.current as any).pollInterval);
				}
				wsRef.current.close();
				wsRef.current = null;
			}
			
			setTracking(false);
			setTrackingId(null);
			setPrices(null);
		} catch (error) {
			console.error('Failed to stop tracking:', error);
		}
	};
	
	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (wsRef.current) {
				if ((wsRef.current as any).pollInterval) {
					clearInterval((wsRef.current as any).pollInterval);
				}
				wsRef.current.close();
			}
		};
	}, []);
	
	const formatPrice = (price: number) => {
		return (price * 100).toFixed(1) + '%';
	};
	
	return (
		<div className="space-y-6">
			{/* Search Form */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="w-5 h-5" />
						Search Game
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						<input
							type="text"
							placeholder="Team 1 (e.g., Leeds)"
							value={team1}
							onChange={(e) => setTeam1(e.target.value)}
							className="border rounded px-3 py-2"
							disabled={tracking}
						/>
						<input
							type="text"
							placeholder="Team 2 (e.g., West Ham)"
							value={team2}
							onChange={(e) => setTeam2(e.target.value)}
							className="border rounded px-3 py-2"
							disabled={tracking}
						/>
						<select
							value={league}
							onChange={(e) => setLeague(e.target.value)}
							className="border rounded px-3 py-2"
							disabled={tracking}
						>
							{leagues.map(l => (
								<option key={l} value={l}>{l}</option>
							))}
						</select>
						<input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="border rounded px-3 py-2"
							disabled={tracking}
						/>
						<Button 
							onClick={handleSearch} 
							disabled={searching || tracking}
							className="w-full"
						>
							{searching ? 'Searching...' : 'Search'}
						</Button>
					</div>
					
					{searchError && (
						<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-red-700">
							<AlertCircle className="w-4 h-4" />
							{searchError}
						</div>
					)}
					
					{searchResult && searchResult.found && (
						<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
							<h3 className="font-semibold text-green-800 mb-2">✓ Game Found</h3>
							<div className="text-sm space-y-1">
								<p><strong>Match:</strong> {searchResult.team1} vs {searchResult.team2}</p>
								<p><strong>League:</strong> {searchResult.league}</p>
								<p><strong>Kalshi:</strong> {searchResult.kalshi.found ? '✓ Found' : '✗ Not found'}</p>
								<p><strong>Polymarket:</strong> {searchResult.polymarket.found ? '✓ Found' : '✗ Not found'}</p>
								{searchResult.trackable && (
									<Button 
										onClick={handleStartTracking}
										className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
									>
										<Play className="w-4 h-4 mr-2" />
										Start Tracking & Arbitrage
									</Button>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
			
			{/* Tracking Status */}
			{tracking && (
				<>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
								Live Tracking
							</CardTitle>
							<Button 
								onClick={handleStopTracking}
								variant="destructive"
								size="sm"
							>
								<Square className="w-4 h-4 mr-2" />
								Stop Tracking
							</Button>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<p className="text-sm font-medium mb-2">Tracking ID</p>
									<code className="text-xs bg-gray-100 px-2 py-1 rounded">{trackingId}</code>
								</div>
								<div>
									<p className="text-sm font-medium mb-2">Game</p>
									<p className="text-sm">{team1} vs {team2} ({league})</p>
								</div>
							</div>
						</CardContent>
					</Card>
					
					{/* Live Prices */}
					{prices && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="w-5 h-5" />
									Live Prices
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<h4 className="font-semibold mb-2">{team1} Win</h4>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="text-gray-600">Kalshi YES</p>
												<p className="text-lg font-bold text-blue-600">
													{formatPrice(prices.kalshi.home_yes.price)}
												</p>
											</div>
											<div>
												<p className="text-gray-600">Polymarket YES</p>
												<p className="text-lg font-bold text-purple-600">
													{formatPrice(prices.polymarket.home_yes.price)}
												</p>
											</div>
										</div>
									</div>
									
									<div>
										<h4 className="font-semibold mb-2">{team2} Win</h4>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="text-gray-600">Kalshi YES</p>
												<p className="text-lg font-bold text-blue-600">
													{formatPrice(prices.kalshi.away_yes.price)}
												</p>
											</div>
											<div>
												<p className="text-gray-600">Polymarket YES</p>
												<p className="text-lg font-bold text-purple-600">
													{formatPrice(prices.polymarket.away_yes.price)}
												</p>
											</div>
										</div>
									</div>
									
									{prices.kalshi.tie_yes && (
										<div>
											<h4 className="font-semibold mb-2">Draw/Tie</h4>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<p className="text-gray-600">Kalshi YES</p>
													<p className="text-lg font-bold text-blue-600">
														{formatPrice(prices.kalshi.tie_yes.price)}
													</p>
												</div>
												<div>
													<p className="text-gray-600">Polymarket YES</p>
													<p className="text-lg font-bold text-purple-600">
														{formatPrice(prices.polymarket.tie_yes?.price || 0)}
													</p>
												</div>
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}
					
					{/* Arbitrage Executions */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="w-5 h-5" />
								Arbitrage Executions ({arbitrageNotifications.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							{arbitrageNotifications.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
									<p>Monitoring for arbitrage opportunities...</p>
								</div>
							) : (
								<div className="space-y-3 max-h-96 overflow-y-auto">
									{arbitrageNotifications.map((notif, idx) => (
										<div key={idx} className="border rounded p-3 bg-gradient-to-r from-green-50 to-blue-50">
											<div className="flex items-start justify-between mb-2">
												<div className="flex items-center gap-2">
													<span className={`px-2 py-1 rounded text-xs font-semibold ${
														notif.event_type === 'arbitrage_executed' ? 'bg-green-100 text-green-800' :
														notif.event_type === 'arbitrage_detected' ? 'bg-yellow-100 text-yellow-800' :
														notif.event_type === 'orders_filled' ? 'bg-blue-100 text-blue-800' :
														'bg-gray-100 text-gray-800'
													}`}>
														{notif.event_type.replace(/_/g, ' ').toUpperCase()}
													</span>
												</div>
												<span className="text-xs text-gray-500">
													{new Date(notif.timestamp).toLocaleTimeString()}
												</span>
											</div>
											
											{notif.arbitrage && (
												<div className="text-sm space-y-1">
													<p><strong>Type:</strong> {notif.arbitrage.type}</p>
													<p><strong>Total Cost:</strong> ${notif.arbitrage.total_cost?.toFixed(4)}</p>
													<p><strong>Profit/Share:</strong> ${notif.arbitrage.profit_per_share?.toFixed(4)}</p>
													<p><strong>ROI:</strong> {notif.arbitrage.roi_percent?.toFixed(2)}%</p>
													<p><strong>Max Shares:</strong> {notif.arbitrage.max_shares}</p>
													{notif.profit && (
														<p className="text-green-600 font-bold">
															<strong>Realized Profit:</strong> ${notif.profit.toFixed(2)}
														</p>
													)}
												</div>
											)}
											
											{notif.execution && (
												<div className="mt-2 text-xs">
													<p className="font-semibold mb-1">Orders Placed:</p>
													{notif.execution.orders?.map((order: any, oidx: number) => (
														<p key={oidx} className="ml-2">
															• {order.exchange} - {order.type}
														</p>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}

